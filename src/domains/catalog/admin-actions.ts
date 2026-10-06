"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { productImages, productVariants, products } from "@/lib/db/schema";
import {
  parseBulkVariantsField,
  productImageSchema,
  productSchema,
  productSpecificationsSchema,
  productVariantSchema,
} from "@/lib/validation/admin";
import { getPaletteColor, KEEP_CURRENT_COLOR } from "@/domains/catalog/color-palette";
import {
  generateProductSlug,
  insertVariantsBulk,
  isSlugTakenByOther,
  loadProductCode,
  VariantInputError,
  type BulkVariantResult,
} from "@/domains/catalog/product-service";
import { replaceProductSpecifications } from "@/domains/catalog/specifications";
import { isStaffOrAdmin, UNAUTHORIZED_ERROR, type ActionResult } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";
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

export async function createProductAction(
  _prev: ActionResult<{ id: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  // Optional: the size × colour matrix filled in on the same screen.
  const variantsField = parseBulkVariantsField(formData.get("variantsJson"));
  if (!variantsField.ok) return { ok: false, error: variantsField.error };

  // Products live on the type level of the category tree only.
  const categoryError = await getProductCategoryError(parsed.data.categoryId);
  if (categoryError) return { ok: false, error: categoryError };

  const { slug: _ignoredSlug, ...fields } = parsed.data;
  void _ignoredSlug;

  let created: { id: string; productCode: number; slug: string };
  let variantResult: BulkVariantResult = { created: 0, skipped: 0 };
  try {
    created = await db.transaction(async (tx) => {
      // The slug is always derived from the title here, never taken from the
      // browser. The code («کد کالا») comes from a DB sequence at insert time,
      // and the variant SKUs are built from it in the same transaction.
      const slug = await generateProductSlug(fields.title, tx);
      const [row] = await tx
        .insert(products)
        .values({ ...fields, slug })
        .returning({ id: products.id, productCode: products.productCode, slug: products.slug });
      if (!row) throw new Error("product insert returned no row");
      if (variantsField.value) variantResult = await insertVariantsBulk(tx, row, variantsField.value);
      return row;
    });
  } catch (error) {
    if (error instanceof VariantInputError) return { ok: false, error: error.message };
    console.error("createProductAction failed", error);
    return { ok: false, error: "خطا در ایجاد محصول؛ دوباره تلاش کنید" };
  }

  await recordAuditLog(session.user, "product.create", "product", created.id, {
    title: fields.title,
    slug: created.slug,
    productCode: created.productCode,
    variantsCreated: variantResult.created,
  });

  revalidateStorefrontForProduct(created.slug);
  return { ok: true, data: { id: created.id } };
}

export async function updateProductAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "محصول یافت نشد" };

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  const existing = await loadProductCode(id);
  if (!existing) return { ok: false, error: "محصول یافت نشد" };

  // Editing the title never silently changes the URL; the slug only changes
  // when the admin explicitly edits the slug field.
  const slug = parsed.data.slug ?? existing.slug;
  if (await isSlugTakenByOther(slug, id)) {
    return { ok: false, error: "این نامک قبلاً استفاده شده است" };
  }

  const categoryError = await getProductCategoryError(parsed.data.categoryId);
  if (categoryError) return { ok: false, error: categoryError };

  // `productCode` is never part of the update — it is assigned once.
  await db
    .update(products)
    .set({ ...parsed.data, slug, updatedAt: new Date() })
    .where(eq(products.id, id));

  await recordAuditLog(session.user, "product.update", "product", id, { ...parsed.data, slug });

  if (existing.slug !== slug) revalidatePath(`/product/${existing.slug}`);
  revalidateStorefrontForProduct(slug);
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

export async function createVariantsAction(
  _prev: ActionResult<{ created: number; skipped: number }>,
  formData: FormData,
): Promise<ActionResult<{ created: number; skipped: number }>> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const productId = String(formData.get("productId") ?? "");
  if (!productId) return { ok: false, error: "محصول یافت نشد" };

  const field = parseBulkVariantsField(formData.get("variantsJson"));
  if (!field.ok) return { ok: false, error: field.error };
  if (!field.value) return { ok: false, error: "حداقل یک سایز و یک رنگ انتخاب کنید" };

  const product = await loadProductCode(productId);
  if (!product) return { ok: false, error: "محصول یافت نشد" };

  let result: BulkVariantResult;
  try {
    result = await db.transaction((tx) => insertVariantsBulk(tx, product, field.value!));
  } catch (error) {
    if (error instanceof VariantInputError) return { ok: false, error: error.message };
    console.error("createVariantsAction failed", error);
    return { ok: false, error: "ثبت انواع محصول ممکن نشد؛ دوباره تلاش کنید" };
  }

  if (result.created === 0) {
    return { ok: false, error: "همه‌ی ترکیب‌های انتخاب‌شده‌ی سایز/رنگ از قبل برای این محصول ثبت شده‌اند" };
  }

  await recordAuditLog(session.user, "product_variant.create", "product_variant", null, {
    productId,
    created: result.created,
    skipped: result.skipped,
  });

  revalidateStorefrontForProduct(product.slug);
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true, data: result };
}

export async function updateVariantAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "نوع محصول یافت نشد" };

  const parsed = productVariantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  const [existing] = await db.select().from(productVariants).where(eq(productVariants.id, id)).limit(1);
  if (!existing) return { ok: false, error: "نوع محصول یافت نشد" };

  // Colour: a palette entry (name + hex resolved server-side), or "keep as
  // is" for a legacy colour that isn't in the palette. The SKU is untouched.
  let color = existing.color;
  let colorHex = existing.colorHex;
  if (parsed.data.colorCode !== KEEP_CURRENT_COLOR) {
    const picked = getPaletteColor(parsed.data.colorCode);
    if (!picked) return { ok: false, error: "رنگ انتخاب‌شده معتبر نیست" };
    color = picked.name;
    colorHex = picked.hex;
  }

  const { colorCode: _colorCode, ...fields } = parsed.data;
  void _colorCode;

  try {
    await db
      .update(productVariants)
      .set({ ...fields, color, colorHex, updatedAt: new Date() })
      .where(eq(productVariants.id, id));
  } catch {
    // The DB's `product_variants_product_size_color_idx` unique constraint
    // is the real invariant enforcer; this is just a friendly message.
    return { ok: false, error: "این ترکیب سایز/رنگ برای این محصول قبلاً ثبت شده است" };
  }

  await recordAuditLog(session.user, "product_variant.update", "product_variant", id, { ...fields, color, colorHex });

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
