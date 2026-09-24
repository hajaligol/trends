import { z } from "zod";
import { MAX_SPEC_ROWS } from "@/lib/validation/spec-limits";
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
  slug: slugSchema,
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

export const productVariantSchema = z.object({
  sku: z.string().trim().min(1, "SKU را وارد کنید").max(64),
  size: z.string().trim().min(1, "سایز را وارد کنید").max(40),
  color: z.string().trim().min(1, "رنگ را وارد کنید").max(60),
  colorHex: z
    .union([z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "کد رنگ نامعتبر است"), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
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
