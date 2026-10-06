import { z } from "zod";
import { MAX_SPEC_ROWS } from "@/lib/validation/spec-limits";
import { MAX_BULK_VARIANTS } from "@/lib/validation/admin-limits";
import { normalizeSpecLabel } from "@/lib/utils/spec-label";

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

const optionalTrimmed = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null));

const nonNegativeIntToman = z.coerce.number().int().min(0, "مقدار نمی‌تواند منفی باشد");

const checkbox = z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean());

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------

export const categorySchema = z.object({
  name: z.string().trim().min(1, "نام دسته را وارد کنید").max(120),
  slug: slugSchema,
  description: optionalTrimmed(2000),
  imageUrl: optionalTrimmed(2000),
  parentId: z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  displayOrder: z.coerce.number().int().default(0),
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
    .union([slugSchema, z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  categoryId: z.string().uuid("دسته را انتخاب کنید"),
  brand: optionalTrimmed(120),
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
  url: z.string().trim().min(1, "آدرس تصویر را وارد کنید").max(2000),
  altText: z.string().trim().min(1, "متن جایگزین (alt) را وارد کنید").max(300),
  variantId: z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  displayOrder: z.coerce.number().int().default(0),
  isPrimary: checkbox,
});

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
  imageUrl: z.string().trim().min(1, "تصویر اسلاید را انتخاب کنید").max(2000),
  ctaHref: optionalTrimmed(300),
  displayOrder: z.coerce.number().int().default(0),
  isActive: checkbox,
});

export const promoBannerSchema = z.object({
  tone: z.enum(["pink", "blue"]),
  title: z.string().trim().min(1, "عنوان را وارد کنید").max(120),
  imageUrl: z.string().trim().min(1, "تصویر بنر را انتخاب کنید").max(2000),
  description: z.string().trim().min(1, "توضیحات را وارد کنید").max(400),
  ctaLabel: z.string().trim().min(1, "متن دکمه را وارد کنید").max(60),
  ctaHref: optionalTrimmed(300),
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
