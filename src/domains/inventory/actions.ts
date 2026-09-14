"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { productVariants, products } from "@/lib/db/schema";
import { stockAdjustmentSchema } from "@/lib/validation/admin";
import { isStaffOrAdmin, UNAUTHORIZED_ERROR, type ActionResult } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";

/**
 * A single, deliberately narrow "adjust stock by a signed delta with a
 * reason" action — not a full `inventory_movements` ledger table.
 * TRENDS_PROJECT_CONTEXT.md §6 "Inventory" lists a movement/audit trail
 * as a requirement; Phase 3's `product_variants.ts` header comment
 * already documented that a full ledger was deliberately deferred past
 * catalog setup, and Phase 8's checkout inventory decrement doesn't use
 * one either (it decrements `stock` directly inside the order
 * transaction). Building a full ledger table now, only for this one
 * admin action, while checkout still doesn't participate in it, would
 * produce a half-populated ledger that's arguably worse than no ledger —
 * so this phase satisfies "inventory movement/audit trail" the same way
 * Phase 10 satisfied order status history for a narrower need: every
 * adjustment is written to the general `audit_logs` table (with the
 * before/after stock and reason in its payload), which is a genuine,
 * queryable trail of who changed what stock and why, without
 * introducing a second inventory-tracking system running in parallel
 * with checkout's un-ledgered decrement. A real per-movement ledger,
 * unifying both paths, is a documented follow-up.
 *
 * Concurrency: the actual update is a single conditional
 * `SET stock = stock + delta WHERE id = ... AND stock + delta >= 0`
 * (never a read-then-write from the client's stale number), per rule
 * "let the database provide the guarantee" already established in
 * Phase 8/9's checkout/coupon code — a concurrent checkout decrementing
 * the same variant can't be raced into a negative stock by this action.
 */
export async function adjustStockAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = stockAdjustmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstField = Object.values(flat.fieldErrors).find((messages) => messages && messages.length > 0);
    return { ok: false, error: firstField?.[0] ?? "اطلاعات وارد شده معتبر نیست" };
  }

  const { variantId, delta, reason } = parsed.data;

  const [before] = await db.select({ stock: productVariants.stock }).from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
  if (!before) return { ok: false, error: "نوع محصول یافت نشد" };

  const [updated] = await db
    .update(productVariants)
    .set({ stock: sql`${productVariants.stock} + ${delta}`, updatedAt: new Date() })
    .where(sql`${productVariants.id} = ${variantId} and ${productVariants.stock} + ${delta} >= 0`)
    .returning({ stock: productVariants.stock, productId: productVariants.productId });

  if (!updated) {
    return { ok: false, error: "موجودی کافی برای این تغییر وجود ندارد" };
  }

  await recordAuditLog(session.user, "inventory.adjust", "product_variant", variantId, {
    delta,
    reason,
    stockBefore: before.stock,
    stockAfter: updated.stock,
  });

  const [product] = await db.select({ slug: products.slug }).from(products).where(eq(products.id, updated.productId)).limit(1);
  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/products/${updated.productId}`);
  if (product?.slug) revalidatePath(`/product/${product.slug}`);
  return { ok: true };
}
