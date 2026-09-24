"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { productImages, productVariants, products } from "@/lib/db/schema";
import { productImageSchema, productSchema, productSpecificationsSchema, productVariantSchema } from "@/lib/validation/admin";
import { replaceProductSpecifications } from "@/domains/catalog/specifications";
import { isStaffOrAdmin, UNAUTHORIZED_ERROR, type ActionResult } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";
import { isProductSlugTaken, isVariantSkuTaken } from "@/domains/catalog/admin-queries";
import { getProductCategoryError } from "@/domains/categories/queries";

/**
 * Admin products/variants/images CRUD. Price/stock/discount fields go
 * through the same Zod coercion/validation every other server-authoritative
 * mutation in this codebase uses (CLAUDE_BUILD_INSTRUCTIONS.txt rule
 * A.11) — an admin form is still a form; its numbers are re-validated
 * here, not trusted just because the caller is staff.
 */

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  const flat = error.flatten();
  const firstField = Object.values(flat.fieldErrors).find((messages) => messages && messages.length > 0);
  return firstField?.[0] ?? "اطلاعات وارد شده معتبر نیست";
}

function revalidateStorefrontForProduct(slug?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/");
  if (slug) revalidatePath(`/product/${slug}`);
}

// ---------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------

export async function createProductAction(_prev: ActionResult<{ id: string }>, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  if (await isProductSlugTaken(parsed.data.slug)) {
    return { ok: false, error: "این نامک قبلاً استفاده شده است" };
  }

  // Products live on the type level of the category tree only.
  const categoryError = await getProductCategoryError(parsed.data.categoryId);
  if (categoryError) return { ok: false, error: categoryError };

  const [created] = await db.insert(products).values(parsed.data).returning({ id: products.id });
  if (!created) return { ok: false, error: "خطا در ایجاد محصول" };

  await recordAuditLog(session.user, "product.create", "product", created.id, {
    title: parsed.data.title,
    slug: parsed.data.slug,
  });

  revalidateStorefrontForProduct(parsed.data.slug);
  return { ok: true, data: { id: created.id } };
}

export async function updateProductAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "محصول یافت نشد" };

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  if (await isProductSlugTaken(parsed.data.slug, id)) {
    return { ok: false, error: "این نامک قبلاً استفاده شده است" };
  }

  const categoryError = await getProductCategoryError(parsed.data.categoryId);
  if (categoryError) return { ok: false, error: categoryError };

  await db
    .update(products)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(products.id, id));

  await recordAuditLog(session.user, "product.update", "product", id, parsed.data);

  revalidateStorefrontForProduct(parsed.data.slug);
  return { ok: true };
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  // Safe by schema design: `order_items.productId`/`variantId` are
  // `onDelete: "set null"` (see that table's header comment) — historical
  // orders keep their own immutable snapshot fields (title/price/etc.)
  // regardless, so deleting a product never corrupts order history, it
  // only detaches the now-gone live product row from it.
  const [deleted] = await db.delete(products).where(eq(products.id, id)).returning({ slug: products.slug });
  await recordAuditLog(session.user, "product.delete", "product", id);

  revalidateStorefrontForProduct(deleted?.slug);
  return { ok: true };
}

export async function saveProductSpecificationsAction(
  _prev: ActionResult<{ saved: boolean }>,
  formData: FormData,
): Promise<ActionResult<{ saved: boolean }>> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const productId = String(formData.get("productId") ?? "");
  const [product] = productId
    ? await db.select({ slug: products.slug }).from(products).where(eq(products.id, productId)).limit(1)
    : [];
  if (!product) return { ok: false, error: "محصول یافت نشد" };

  const labels = formData.getAll("specLabel").map(String);
  const values = formData.getAll("specValue").map(String);
  if (labels.length !== values.length) return { ok: false, error: "اطلاعات وارد شده معتبر نیست" };

  const parsed = productSpecificationsSchema.safeParse(labels.map((label, index) => ({ label, value: values[index] })));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "اطلاعات وارد شده معتبر نیست" };

  try {
    await replaceProductSpecifications(productId, parsed.data);
  } catch {
    // The DB's unique/length constraints are the backstop for anything the
    // schema above let through; never leak the raw error to the admin UI.
    return { ok: false, error: "ذخیره جدول مشخصات ممکن نشد" };
  }

  await recordAuditLog(session.user, "product.specifications.update", "product", productId, {
    rows: parsed.data,
  });

  revalidateStorefrontForProduct(product.slug);
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true, data: { saved: true } };
}

// ---------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------

export async function createVariantAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const productId = String(formData.get("productId") ?? "");
  if (!productId) return { ok: false, error: "محصول یافت نشد" };

  const parsed = productVariantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  if (await isVariantSkuTaken(parsed.data.sku)) {
    return { ok: false, error: "این SKU قبلاً استفاده شده است" };
  }

  try {
    await db.insert(productVariants).values({ ...parsed.data, productId });
  } catch {
    // Catches the DB's own `product_variants_product_size_color_idx`
    // unique constraint — the real invariant enforcer per
    // CLAUDE_BUILD_INSTRUCTIONS.txt "Never rely only on application code
    // to enforce uniqueness"; this is just a friendly message for it.
    return { ok: false, error: "این ترکیب سایز/رنگ برای این محصول قبلاً ثبت شده است" };
  }

  await recordAuditLog(session.user, "product_variant.create", "product_variant", null, {
    productId,
    sku: parsed.data.sku,
  });

  const [product] = await db.select({ slug: products.slug }).from(products).where(eq(products.id, productId)).limit(1);
  revalidateStorefrontForProduct(product?.slug);
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true };
}

export async function updateVariantAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "نوع محصول یافت نشد" };

  const parsed = productVariantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  if (await isVariantSkuTaken(parsed.data.sku, id)) {
    return { ok: false, error: "این SKU قبلاً استفاده شده است" };
  }

  const [existing] = await db
    .select({ productId: productVariants.productId })
    .from(productVariants)
    .where(eq(productVariants.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: "نوع محصول یافت نشد" };

  try {
    await db
      .update(productVariants)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(productVariants.id, id));
  } catch {
    return { ok: false, error: "این ترکیب سایز/رنگ برای این محصول قبلاً ثبت شده است" };
  }

  await recordAuditLog(session.user, "product_variant.update", "product_variant", id, parsed.data);

  const [product] = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.id, existing.productId))
    .limit(1);
  revalidateStorefrontForProduct(product?.slug);
  revalidatePath(`/admin/products/${existing.productId}`);
  return { ok: true };
}

export async function deleteVariantAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const [existing] = await db
    .select({ productId: productVariants.productId })
    .from(productVariants)
    .where(eq(productVariants.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: "نوع محصول یافت نشد" };

  await db.delete(productVariants).where(eq(productVariants.id, id));
  await recordAuditLog(session.user, "product_variant.delete", "product_variant", id);

  const [product] = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.id, existing.productId))
    .limit(1);
  revalidateStorefrontForProduct(product?.slug);
  revalidatePath(`/admin/products/${existing.productId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------

export async function createImageAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const productId = String(formData.get("productId") ?? "");
  if (!productId) return { ok: false, error: "محصول یافت نشد" };

  const parsed = productImageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  await db.insert(productImages).values({ ...parsed.data, productId });
  await recordAuditLog(session.user, "product_image.create", "product_image", null, { productId });

  const [product] = await db.select({ slug: products.slug }).from(products).where(eq(products.id, productId)).limit(1);
  revalidateStorefrontForProduct(product?.slug);
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true };
}

export async function deleteImageAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const [deleted] = await db.delete(productImages).where(eq(productImages.id, id)).returning({ productId: productImages.productId });
  await recordAuditLog(session.user, "product_image.delete", "product_image", id);

  if (deleted) {
    const [product] = await db.select({ slug: products.slug }).from(products).where(eq(products.id, deleted.productId)).limit(1);
    revalidateStorefrontForProduct(product?.slug);
    revalidatePath(`/admin/products/${deleted.productId}`);
  }
  return { ok: true };
}
