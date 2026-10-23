import { z } from "zod";
import { isHostedAssetPath } from "@/lib/utils/asset-path";
import { MAX_SPEC_ROWS } from "@/lib/validation/spec-limits";
import {
  MAX_SIZE_CHART_CELL_LENGTH,
  MAX_SIZE_CHART_COLUMNS,
  MAX_SIZE_CHART_NOTE_LENGTH,
  MAX_SIZE_CHART_ROWS,
} from "@/lib/validation/size-chart-limits";
import { MAX_BULK_VARIANTS } from "@/lib/validation/admin-limits";
import { normalizeSpecLabel } from "@/lib/utils/spec-label";
import { isValidProductSlug } from "@/domains/catalog/slug";

/**
 * Server-side validation for every Phase 11 admin mutation
 * (categories/products/variants/images/coupons/hero-slides/promo-banners/
 * settings/customer-role/stock-adjustment), per
 * CLAUDE_BUILD_INSTRUCTIONS.txt rule A.9. Mirrors `src/lib/validation/auth.ts`'s
 * pattern: Server Actions call `.safeParse()` on `FormData`-derived
 * objects, never trusting that a field merely existed or that a hidden
 * client-side input constraint held.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1, "نامک را وارد کنید")
  .max(160)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "نامک باید فقط شامل حروف انگلیسی کوچک، عدد و خط تیره باشد");

/** Product slugs may contain Persian letters (category slugs stay ASCII). */
const productSlugSchema = z
  .string()
  .trim()
  .min(1, "نامک را وارد کنید")
  .max(160)
  .refine(isValidProductSlug, "نامک باید فقط شامل حروف فارسی یا انگلیسی کوچک، عدد و خط تیره باشد (بدون فاصله)");

const optionalTrimmed = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null));

const nonNegativeIntToman = z.coerce.number().int().min(0, "مقدار نمی‌تواند منفی باشد");

const checkbox = z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean());

/** Images are always files we host (`/assets/...`, from the upload endpoint):
 * `next/image` has no remote hosts configured, so an arbitrary external URL
 * would crash every page that renders it, and anything else (`javascript:`,
 * `data:`) must never be stored. */
const hostedImagePath = z
  .string()
  .trim()
  .max(500)
  .refine(isHostedAssetPath, "تصویر باید با دکمه‌ی بارگذاری تصویر انتخاب شود");

/** Button/slide links: a site-relative path or an http(s) URL, never
 * `javascript:`/`data:` (render sites also pass through `safeHref`). */
const linkHref = z
  .string()
  .trim()
  .max(300)
  .refine(
    (value) => value === "" || (value.startsWith("/") && !value.startsWith("//")) || /^https?:\/\//i.test(value),
    "لینک باید با / یا http(s):// شروع شود",
  )
  .optional()
  .transform((value) => (value ? value : null));

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------

export const categorySchema = z.object({
  name: z.string().trim().min(1, "نام دسته را وارد کنید").max(120),
  slug: slugSchema,
  description: optionalTrimmed(2000),
  imageUrl: z
    .union([hostedImagePath, z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  parentId: z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  displayOrder: z.coerce.number().int().default(0),
  isActive: checkbox,
});

// ---------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------

/** Logos are always files we host (`/assets/...`, from the upload endpoint):
 * `next/image` has no remote hosts configured, so an arbitrary external URL
 * would crash the product page that renders it. */

export const brandSchema = z.object({
  name: z.string().trim().min(1, "نام برند را وارد کنید").max(120),
  nameEn: optionalTrimmed(120),
  // Create: ignored — generated from the name on the server. Edit: optional;
  // blank keeps the current slug.
  slug: z
    .union([productSlugSchema, z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  description: optionalTrimmed(2000),
  logoUrl: z
    .union([hostedImagePath, z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  countryOfOrigin: optionalTrimmed(80),
  displayOrder: z.coerce.number().int().min(-100000).max(100000).default(0),
  isActive: checkbox,
});

// ---------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------

export const productSchema = z.object({
  title: z.string().trim().min(1, "عنوان محصول را وارد کنید").max(200),
  // Create: ignored — the slug is always generated from the title on the
  // server. Edit: optional; blank keeps the current slug.
  slug: z
    .union([productSlugSchema, z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  categoryId: z.string().uuid("دسته را انتخاب کنید"),
  // The brand is picked from the managed list (`brands`); the server checks
  // that it exists and is selectable (`getProductBrandError`).
  brandId: z
    .union([z.string().uuid("برند نامعتبر است"), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  shortDescription: optionalTrimmed(500),
  longDescription: optionalTrimmed(5000),
  tags: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    ),
  seoTitle: optionalTrimmed(160),
  seoDescription: optionalTrimmed(300),
  isActive: checkbox,
  isFeatured: checkbox,
  isNewArrival: checkbox,
});

/** Editing ONE existing variant. The SKU is deliberately not an input: it is
 * generated once (from the product code) and never edited by hand. */
export const productVariantSchema = z.object({
  size: z.string().trim().min(1, "سایز را وارد کنید").max(40),
  colorCode: z.string().trim().min(1, "رنگ را انتخاب کنید").max(40),
  material: optionalTrimmed(80),
  priceToman: nonNegativeIntToman,
  compareAtPriceToman: z
    .union([nonNegativeIntToman, z.literal("")])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
  stock: z.coerce.number().int().min(0, "موجودی نمی‌تواند منفی باشد"),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  isActive: checkbox,
});


/** One row of the size × colour matrix. Colour arrives as a palette `code`;
 * its name/hex are resolved on the server. The numbers are strict JSON
 * numbers — NOT coerced — so a blank price (`null`) is rejected instead of
 * silently becoming 0 (a free product). */
const bulkVariantRow = z.object({
  size: z.string().trim().min(1, "سایز را وارد کنید").max(40),
  colorCode: z.string().trim().min(1, "رنگ را انتخاب کنید").max(10),
  priceToman: z
    .number({ error: "قیمت همه‌ی انواع را وارد کنید" })
    .int("قیمت باید عدد صحیح باشد")
    .min(0, "قیمت نمی‌تواند منفی باشد")
    .max(2_000_000_000, "قیمت بیش از حد بزرگ است"),
  compareAtPriceToman: z
    .number()
    .int()
    .min(0)
    .max(2_000_000_000)
    .nullish()
    .transform((value) => value ?? null),
  stock: z
    .number({ error: "موجودی همه‌ی انواع را وارد کنید" })
    .int("موجودی باید عدد صحیح باشد")
    .min(0, "موجودی نمی‌تواند منفی باشد")
    .max(1_000_000, "موجودی بیش از حد بزرگ است"),
});

/** The whole "many variants at once" payload (`variantsJson` form field). */
export const bulkVariantsSchema = z.object({
  material: optionalTrimmed(80),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
  rows: z.array(bulkVariantRow).min(1, "حداقل یک سایز و یک رنگ انتخاب کنید").max(MAX_BULK_VARIANTS, `حداکثر ${MAX_BULK_VARIANTS} نوع در هر بار قابل ثبت است`),
});

export type BulkVariantsInput = z.infer<typeof bulkVariantsSchema>;

/** Parses the `variantsJson` form field; `null` when absent/blank. */
export function parseBulkVariantsField(
  raw: FormDataEntryValue | null,
): { ok: true; value: BulkVariantsInput | null } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  const text = String(raw).trim();
  if (text === "" || text === "null") return { ok: true, value: null };
  if (text.length > 100_000) return { ok: false, error: "اطلاعات انواع محصول بیش از حد بزرگ است" };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "اطلاعات انواع محصول معتبر نیست" };
  }
  const parsed = bulkVariantsSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "اطلاعات انواع محصول معتبر نیست" };
  return { ok: true, value: parsed.data };
}

export const productImageSchema = z.object({
  url: hostedImagePath,
  altText: z.string().trim().min(1, "متن جایگزین (alt) را وارد کنید").max(300),
  // Colour name this photo belongs to (one of the product's variant colours,
  // checked against the DB in `createImageAction`); empty = shared image.
  color: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((value) => (value ? value : null)),
  displayOrder: z.coerce.number().int().default(0),
  isPrimary: checkbox,
});

/** Most photos accepted in one create-product request. */
export const MAX_CREATE_PRODUCT_IMAGES = 12;

const createImageRow = z.object({
  url: hostedImagePath,
  altText: z.string().trim().min(1, "متن جایگزین (alt) همه‌ی تصاویر را وارد کنید").max(300),
  color: z
    .string()
    .trim()
    .max(60)
    .nullish()
    .transform((value) => (value ? value : null)),
  isPrimary: z.boolean().optional().default(false),
});

export type CreateImageRow = { url: string; altText: string; color: string | null; displayOrder: number; isPrimary: boolean };

/**
 * Parses the `imagesJson` field of the staged "new product" form.
 *
 * - Array order becomes `displayOrder`.
 * - Exactly one image ends up primary: the first one flagged, or the first
 *   image when none is flagged.
 * - A colour-scoped image must name one of `allowedColors` (the colours of the
 *   variants created in the same request); otherwise it would be stored but
 *   never shown.
 */
export function parseCreateImagesField(
  raw: FormDataEntryValue | null,
  allowedColors: readonly string[],
): { ok: true; value: CreateImageRow[] } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true, value: [] };
  const text = String(raw).trim();
  if (text === "" || text === "null" || text === "[]") return { ok: true, value: [] };
  if (text.length > 100_000) return { ok: false, error: "اطلاعات تصاویر بیش از حد بزرگ است" };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "اطلاعات تصاویر معتبر نیست" };
  }
  const parsed = z
    .array(createImageRow)
    .max(MAX_CREATE_PRODUCT_IMAGES, `حداکثر ${MAX_CREATE_PRODUCT_IMAGES} تصویر در هر بار قابل ثبت است`)
    .safeParse(json);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "اطلاعات تصاویر معتبر نیست" };

  const allowed = new Set(allowedColors);
  for (const row of parsed.data) {
    if (row.color !== null && !allowed.has(row.color)) {
      return { ok: false, error: "رنگ انتخاب‌شده برای یکی از تصاویر در انواع محصول وجود ندارد" };
    }
  }

  const primaryIndex = Math.max(
    0,
    parsed.data.findIndex((row) => row.isPrimary),
  );
  return {
    ok: true,
    value: parsed.data.map((row, index) => ({
      url: row.url,
      altText: row.altText,
      color: row.color,
      displayOrder: index,
      isPrimary: index === primaryIndex,
    })),
  };
}

// ---------------------------------------------------------------------
// Product specifications (custom rows of the «مشخصات محصول» table)
// ---------------------------------------------------------------------

const specRowInput = z.object({
  label: z.string().trim().max(80, "عنوان هر ردیف حداکثر ۸۰ نویسه می‌تواند باشد"),
  value: z.string().trim().max(500, "مقدار هر ردیف حداکثر ۵۰۰ نویسه می‌تواند باشد"),
});

/** Fully blank rows are dropped (an admin adding then not filling a row is
 * not an error); a half-filled row, a duplicate label or too many rows is. */
export const productSpecificationsSchema = z
  .array(specRowInput)
  .max(MAX_SPEC_ROWS + 20, "تعداد ردیف‌ها بیش از حد مجاز است")
  .transform((rows) => rows.filter((row) => row.label !== "" || row.value !== ""))
  .superRefine((rows, ctx) => {
    if (rows.length > MAX_SPEC_ROWS) {
      ctx.addIssue({ code: "custom", message: `حداکثر ${MAX_SPEC_ROWS} ردیف مجاز است` });
    }
    const seen = new Set<string>();
    for (const row of rows) {
      if (row.label === "" || row.value === "") {
        ctx.addIssue({ code: "custom", message: "برای هر ردیف هم عنوان و هم مقدار را وارد کنید" });
        return;
      }
      const key = normalizeSpecLabel(row.label);
      if (seen.has(key)) {
        ctx.addIssue({ code: "custom", message: `عنوان «${row.label}» بیش از یک بار استفاده شده است` });
        return;
      }
      seen.add(key);
    }
  });

// ---------------------------------------------------------------------
// Product sizing table («راهنمای سایز»)
// ---------------------------------------------------------------------

const sizeChartCell = z.string().trim().max(MAX_SIZE_CHART_CELL_LENGTH, `هر خانه حداکثر ${MAX_SIZE_CHART_CELL_LENGTH} نویسه می‌تواند باشد`);

/** Input: `columns` headings and `cells` in row-major order (as posted by
 * the editor). Output: a rectangular `{columns, rows, note}`, or `null`
 * when the admin left the table empty (= remove the table). Fully blank
 * rows are dropped; a half-blank heading or a table with no filled cell
 * is an error rather than being saved as junk. */
export const sizeChartSchema = z
  .object({
    columns: z.array(sizeChartCell).max(MAX_SIZE_CHART_COLUMNS + 4, "تعداد ستون‌ها بیش از حد مجاز است"),
    cells: z.array(sizeChartCell).max((MAX_SIZE_CHART_COLUMNS + 4) * (MAX_SIZE_CHART_ROWS + 10)),
    note: z.string().trim().max(MAX_SIZE_CHART_NOTE_LENGTH, `توضیح حداکثر ${MAX_SIZE_CHART_NOTE_LENGTH} نویسه می‌تواند باشد`),
  })
  .transform((input, ctx) => {
    const width = input.columns.length;
    if (width === 0 || input.cells.length % width !== 0) {
      if (width !== 0) ctx.addIssue({ code: "custom", message: "اطلاعات جدول معتبر نیست" });
    }
    const rows: string[][] = [];
    if (width > 0) {
      for (let i = 0; i + width <= input.cells.length; i += width) rows.push(input.cells.slice(i, i + width));
    }
    // Drop fully blank rows and fully blank columns (heading and every cell).
    const filledRows = rows.filter((row) => row.some((cell) => cell !== ""));
    const keep = input.columns
      .map((heading, index) => (heading !== "" || filledRows.some((row) => row[index] !== "") ? index : -1))
      .filter((index) => index >= 0);
    const note = input.note === "" ? null : input.note;
    if (keep.length === 0 || filledRows.length === 0) {
      if (input.columns.some((heading) => heading !== "") && filledRows.length === 0) {
        ctx.addIssue({ code: "custom", message: "حداقل یک ردیف از جدول را پر کنید یا جدول را خالی بگذارید" });
      }
      return null;
    }
    if (keep.length > MAX_SIZE_CHART_COLUMNS) {
      ctx.addIssue({ code: "custom", message: `حداکثر ${MAX_SIZE_CHART_COLUMNS} ستون مجاز است` });
    }
    if (filledRows.length > MAX_SIZE_CHART_ROWS) {
      ctx.addIssue({ code: "custom", message: `حداکثر ${MAX_SIZE_CHART_ROWS} ردیف مجاز است` });
    }
    const columns = keep.map((index) => input.columns[index]!);
    if (columns.some((heading) => heading === "")) {
      ctx.addIssue({ code: "custom", message: "برای هر ستون یک عنوان وارد کنید" });
    }
    if (new Set(columns.map(normalizeSpecLabel)).size !== columns.length) {
      ctx.addIssue({ code: "custom", message: "عنوان ستون‌ها نباید تکراری باشد" });
    }
    return {
      columns,
      rows: filledRows.map((row) => keep.map((index) => row[index]!)),
      note,
    };
  });

// ---------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------

export const stockAdjustmentSchema = z.object({
  variantId: z.string().uuid(),
  delta: z.coerce.number().int().refine((value) => value !== 0, "مقدار تغییر نمی‌تواند صفر باشد"),
  reason: z.string().trim().min(1, "دلیل تغییر موجودی را وارد کنید").max(300),
});

// ---------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "کد تخفیف باید حداقل ۳ کاراکتر باشد")
      .max(40)
      .regex(/^[A-Z0-9_-]+$/, "کد تخفیف فقط می‌تواند شامل حروف انگلیسی، عدد، خط تیره و آندرلاین باشد"),
    discountType: z.enum(["percentage", "fixed"]),
    discountValue: z.coerce.number().int().min(1, "مقدار تخفیف باید بزرگتر از صفر باشد"),
    minBasketToman: nonNegativeIntToman.default(0),
    startsAt: z
      .union([z.string().min(1), z.literal("")])
      .optional()
      .transform((value) => (value ? new Date(value) : null)),
    endsAt: z
      .union([z.string().min(1), z.literal("")])
      .optional()
      .transform((value) => (value ? new Date(value) : null)),
    usageLimit: z
      .union([z.coerce.number().int().min(1), z.literal("")])
      .optional()
      .transform((value) => (value === "" || value === undefined ? null : value)),
    perCustomerLimit: z
      .union([z.coerce.number().int().min(1), z.literal("")])
      .optional()
      .transform((value) => (value === "" || value === undefined ? null : value)),
    isActive: checkbox,
  })
  .refine(
    (data) => data.discountType !== "percentage" || (data.discountValue >= 1 && data.discountValue <= 100),
    { message: "درصد تخفیف باید بین ۱ تا ۱۰۰ باشد", path: ["discountValue"] },
  )
  .refine((data) => !data.startsAt || !data.endsAt || data.startsAt < data.endsAt, {
    message: "تاریخ شروع باید قبل از تاریخ پایان باشد",
    path: ["endsAt"],
  });

// ---------------------------------------------------------------------
// Homepage content: hero slides + promo banners
// ---------------------------------------------------------------------

export const heroSlideSchema = z.object({
  alt: z.string().trim().min(1, "متن جایگزین (alt) را وارد کنید").max(300),
  imageUrl: hostedImagePath,
  // Mandatory: phones show their own, taller picture (see HeroCarousel).
  mobileImageUrl: z.string().trim().min(1, "تصویر موبایل را انتخاب کنید").pipe(hostedImagePath),
  ctaHref: linkHref,
  displayOrder: z.coerce.number().int().default(0),
  isActive: checkbox,
});

export const promoBannerSchema = z.object({
  tone: z.enum(["pink", "blue"]),
  title: z.string().trim().min(1, "عنوان را وارد کنید").max(120),
  imageUrl: hostedImagePath,
  description: z.string().trim().min(1, "توضیحات را وارد کنید").max(400),
  ctaLabel: z.string().trim().min(1, "متن دکمه را وارد کنید").max(60),
  ctaHref: linkHref,
  displayOrder: z.coerce.number().int().default(0),
  isActive: checkbox,
});

// ---------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------

export const siteSettingsSchema = z.object({
  storeName: z.string().trim().min(1, "نام فروشگاه را وارد کنید").max(120),
  supportEmail: z
    .union([z.string().trim().toLowerCase().email("ایمیل معتبر نیست"), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  supportPhone: optionalTrimmed(30),
  standardShippingFeeToman: nonNegativeIntToman,
  expressShippingFeeToman: nonNegativeIntToman,
  freeShippingThresholdToman: nonNegativeIntToman,
});

// ---------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------

export const customerRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["customer", "staff", "admin"]),
});

// ---------------------------------------------------------------------
// Reviews (Phase 12)
// ---------------------------------------------------------------------

export const reviewModerationSchema = z.object({
  reviewId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  moderationNote: optionalTrimmed(500),
});

export const MAX_REVIEW_REPLY_LENGTH = 1000;

/** `intent: "save"` creates/edits the store's public reply (non-empty,
 * trimmed); `intent: "delete"` removes it. */
export const reviewReplySchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("save"),
    reviewId: z.string().uuid(),
    reply: z
      .string()
      .trim()
      .min(1, "متن پاسخ را وارد کنید")
      .max(MAX_REVIEW_REPLY_LENGTH, `پاسخ نباید بیشتر از ${MAX_REVIEW_REPLY_LENGTH} نویسه باشد`),
  }),
  z.object({ intent: z.literal("delete"), reviewId: z.string().uuid() }),
]);
