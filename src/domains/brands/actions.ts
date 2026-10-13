"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { brands } from "@/lib/db/schema";
import { brandSchema } from "@/lib/validation/admin";
import { isStaffOrAdmin, UNAUTHORIZED_ERROR, type ActionResult } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";
import { generateBrandSlug } from "@/domains/brands/slug";
import { countProductsOfBrand, isBrandNameTaken, isBrandSlugTaken } from "@/domains/brands/queries";

/**
 * Admin brand CRUD. Like every admin action, each one re-checks the session
 * role itself instead of trusting the `/admin` layout gate.
 */

const NAME_TAKEN = "برندی با این نام قبلاً ثبت شده است";
const SLUG_TAKEN = "این نامک قبلاً استفاده شده است";

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  const flat = error.flatten();
  const firstField = Object.values(flat.fieldErrors).find((messages) => messages && messages.length > 0);
  return firstField?.[0] ?? "اطلاعات وارد شده معتبر نیست";
}

/** Postgres unique-violation (two admins racing past the pre-checks). */
function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string; cause?: { code?: string } } | null)?.code;
  const causeCode = (error as { cause?: { code?: string } } | null)?.cause?.code;
  return code === "23505" || causeCode === "23505";
}

/** A brand's name/logo shows on product pages and in search, so a brand
 * change must refresh them (and the admin product form's options). */
function revalidateBrandSurfaces() {
  revalidatePath("/admin/brands");
  revalidatePath("/admin/products");
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/search");
}

export async function createBrandAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = brandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  if (await isBrandNameTaken(parsed.data.name)) return { ok: false, error: NAME_TAKEN };

  // The slug is always derived on the server at creation.
  const { slug: _ignoredSlug, ...fields } = parsed.data;
  void _ignoredSlug;

  let createdId: string | undefined;
  try {
    const slug = await generateBrandSlug(fields.name, fields.nameEn);
    const [created] = await db.insert(brands).values({ ...fields, slug }).returning({ id: brands.id });
    createdId = created?.id;
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: NAME_TAKEN };
    console.error("createBrandAction failed", error);
    return { ok: false, error: "خطا در ثبت برند؛ دوباره تلاش کنید" };
  }

  await recordAuditLog(session.user, "brand.create", "brand", createdId ?? null, fields);
  revalidateBrandSurfaces();
  return { ok: true };
}

export async function updateBrandAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "برند یافت نشد" };

  const parsed = brandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  const [existing] = await db.select({ slug: brands.slug }).from(brands).where(eq(brands.id, id)).limit(1);
  if (!existing) return { ok: false, error: "برند یافت نشد" };

  // Blank slug keeps the current one; renaming a brand never changes it.
  const slug = parsed.data.slug ?? existing.slug;
  if (await isBrandNameTaken(parsed.data.name, id)) return { ok: false, error: NAME_TAKEN };
  if (await isBrandSlugTaken(slug, id)) return { ok: false, error: SLUG_TAKEN };

  try {
    await db
      .update(brands)
      .set({ ...parsed.data, slug, updatedAt: new Date() })
      .where(eq(brands.id, id));
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "نام یا نامک این برند با برند دیگری تکراری است" };
    console.error("updateBrandAction failed", error);
    return { ok: false, error: "خطا در ذخیره برند؛ دوباره تلاش کنید" };
  }

  await recordAuditLog(session.user, "brand.update", "brand", id, { ...parsed.data, slug });
  revalidateBrandSurfaces();
  return { ok: true };
}

/** One-click activate/deactivate from the list. Products keep their brand. */
export async function toggleBrandActiveAction(id: string, nextActive: boolean): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };
  if (typeof nextActive !== "boolean") return { ok: false, error: "اطلاعات وارد شده معتبر نیست" };

  const updated = await db
    .update(brands)
    .set({ isActive: nextActive, updatedAt: new Date() })
    .where(eq(brands.id, id))
    .returning({ id: brands.id });
  if (updated.length === 0) return { ok: false, error: "برند یافت نشد" };

  await recordAuditLog(session.user, "brand.toggle_active", "brand", id, { isActive: nextActive });
  revalidateBrandSurfaces();
  return { ok: true };
}

export async function deleteBrandAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const inUse = await countProductsOfBrand(id);
  if (inUse > 0) {
    return {
      ok: false,
      error: "این برند به محصول‌هایی اختصاص داده شده و قابل حذف نیست؛ به‌جای حذف، آن را غیرفعال کنید",
    };
  }

  try {
    const deleted = await db.delete(brands).where(eq(brands.id, id)).returning({ id: brands.id });
    if (deleted.length === 0) return { ok: false, error: "برند یافت نشد" };
  } catch (error) {
    // A product was attached between the check above and the delete: the
    // `ON DELETE RESTRICT` foreign key is the real guard (23503).
    const code = (error as { code?: string; cause?: { code?: string } } | null)?.code;
    const causeCode = (error as { cause?: { code?: string } } | null)?.cause?.code;
    if (code === "23503" || causeCode === "23503") {
      return { ok: false, error: "این برند به محصولی اختصاص داده شده و قابل حذف نیست؛ آن را غیرفعال کنید" };
    }
    console.error("deleteBrandAction failed", error);
    return { ok: false, error: "خطا در حذف برند؛ دوباره تلاش کنید" };
  }

  await recordAuditLog(session.user, "brand.delete", "brand", id);
  revalidateBrandSurfaces();
  return { ok: true };
}
