"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { categorySchema } from "@/lib/validation/admin";
import { isStaffOrAdmin, UNAUTHORIZED_ERROR, type ActionResult } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";
import { categoryHasChildrenOrProducts, isCategorySlugTaken } from "@/domains/categories/queries";

/**
 * Admin category CRUD. Every action re-checks `session.user.role`
 * itself (never trusts that `/admin`'s layout gate was the only thing
 * standing between a request and this mutation) — the same defense-in-
 * depth stance `orders/admin-actions.ts` already established.
 */

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  const flat = error.flatten();
  const firstField = Object.values(flat.fieldErrors).find((messages) => messages && messages.length > 0);
  return firstField?.[0] ?? "اطلاعات وارد شده معتبر نیست";
}

export async function createCategoryAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  if (await isCategorySlugTaken(parsed.data.slug)) {
    return { ok: false, error: "این نامک قبلاً استفاده شده است" };
  }

  const [created] = await db.insert(categories).values(parsed.data).returning({ id: categories.id });
  await recordAuditLog(session.user, "category.create", "category", created?.id ?? null, parsed.data);

  revalidatePath("/admin/categories");
  revalidatePath("/");
  return { ok: true };
}

export async function updateCategoryAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "دسته یافت نشد" };

  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  if (parsed.data.parentId === id) {
    return { ok: false, error: "یک دسته نمی‌تواند والد خودش باشد" };
  }
  if (await isCategorySlugTaken(parsed.data.slug, id)) {
    return { ok: false, error: "این نامک قبلاً استفاده شده است" };
  }

  await db
    .update(categories)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(categories.id, id));

  await recordAuditLog(session.user, "category.update", "category", id, parsed.data);

  revalidatePath("/admin/categories");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  if (await categoryHasChildrenOrProducts(id)) {
    return {
      ok: false,
      error: "این دسته دارای زیردسته یا محصول است و قابل حذف نیست؛ ابتدا آن‌ها را جابه‌جا یا حذف کنید",
    };
  }

  await db.delete(categories).where(eq(categories.id, id));
  await recordAuditLog(session.user, "category.delete", "category", id);

  revalidatePath("/admin/categories");
  revalidatePath("/");
  return { ok: true };
}
