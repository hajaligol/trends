import { z } from "zod";
import { isValidProductSlug } from "@/domains/catalog/slug";
import { tehranInputToDate } from "@/lib/utils/tehran-time";

/**
 * Server-side validation for T-Mag. Admin schemas are parsed from `FormData`
 * in the Server Actions; the comment schema is the only public one.
 */

const checkbox = z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean());

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null));

/** Uploaded files only (`/assets/...`): `next/image` has no remote hosts and the CSP blocks other images. */
const localAssetPath = z
  .string()
  .max(500)
  .regex(/^\/assets\/[A-Za-z0-9._\-/]+$/, "تصویر باید با دکمه‌ی بارگذاری انتخاب شود")
  .refine((value) => !value.includes(".."), "مسیر تصویر نامعتبر است");

const slugSchema = z
  .string()
  .trim()
  .min(1, "نامک را وارد کنید")
  .max(160)
  .refine(isValidProductSlug, "نامک باید فقط شامل حروف فارسی یا انگلیسی کوچک، عدد و خط تیره باشد (بدون فاصله)");

/** One item per line, trimmed, blanks dropped, capped. */
function lines(maxItems: number, maxLength: number) {
  return z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().max(maxLength, `هر مورد حداکثر ${maxLength} کاراکتر باشد`)).max(maxItems, `حداکثر ${maxItems} مورد مجاز است`));
}

const tagList = z
  .string()
  .optional()
  .transform((value) =>
    Array.from(
      new Set(
        (value ?? "")
          .split(/[,،\n]/)
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ),
  )
  .pipe(z.array(z.string().max(40, "هر برچسب حداکثر ۴۰ کاراکتر باشد")).max(12, "حداکثر ۱۲ برچسب مجاز است"));

const faqList = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      ctx.addIssue({ code: "custom", message: "فرمت پرسش‌های متداول نامعتبر است" });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(
        z.object({
          question: z.string().trim().max(200, "پرسش حداکثر ۲۰۰ کاراکتر باشد"),
          answer: z.string().trim().max(1500, "پاسخ حداکثر ۱۵۰۰ کاراکتر باشد"),
        }),
      )
      .max(12, "حداکثر ۱۲ پرسش مجاز است"),
  )
  // Half-filled rows are dropped, not saved.
  .transform((items) => items.filter((item) => item.question && item.answer));

export const blogPostSchema = z
  .object({
    title: z.string().trim().min(3, "عنوان مقاله را وارد کنید").max(160, "عنوان حداکثر ۱۶۰ کاراکتر باشد"),
    // Create: ignored (derived from the title). Edit: blank keeps the current slug.
    slug: z
      .union([slugSchema, z.literal("")])
      .optional()
      .transform((value) => (value ? value : null)),
    excerpt: z.string().trim().min(10, "خلاصه‌ی مقاله را بنویسید (حداقل ۱۰ کاراکتر)").max(320, "خلاصه حداکثر ۳۲۰ کاراکتر باشد"),
    content: z.string().trim().min(20, "متن مقاله را بنویسید").max(120_000, "متن مقاله بیش از حد طولانی است"),
    coverImageUrl: z
      .union([localAssetPath, z.literal("")])
      .optional()
      .transform((value) => (value ? value : null)),
    coverImageAlt: optionalText(200),
    categoryId: z
      .union([z.string().uuid(), z.literal("")])
      .optional()
      .transform((value) => (value ? value : null)),
    authorName: z.string().trim().min(2, "نام نویسنده را وارد کنید").max(80),
    status: z.enum(["draft", "published"]),
    publishedAt: z
      .string()
      .optional()
      .transform((value) => (value ? tehranInputToDate(value) : null)),
    seoTitle: optionalText(70),
    seoDescription: optionalText(170),
    tags: tagList,
    keyTakeaways: lines(8, 220),
    faq: faqList,
  })
  .superRefine((value, ctx) => {
    if (value.coverImageUrl && !value.coverImageAlt) {
      ctx.addIssue({ code: "custom", path: ["coverImageAlt"], message: "برای تصویر شاخص، متن جایگزین (alt) را بنویسید" });
    }
  });

export const blogCategorySchema = z.object({
  name: z.string().trim().min(2, "نام دسته را وارد کنید").max(80),
  slug: z
    .union([slugSchema, z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  description: optionalText(400),
  displayOrder: z.coerce.number().int().min(-100000).max(100000).default(0),
  isActive: checkbox,
});

export const blogCommentSchema = z.object({
  postSlug: z.string().trim().min(1).max(400),
  body: z
    .string()
    .trim()
    .min(2, "متن دیدگاه را بنویسید")
    .max(1500, "متن دیدگاه حداکثر ۱۵۰۰ کاراکتر باشد")
    // Plain text only: no links, so a comment cannot be used for link spam.
    .refine((value) => !/(https?:\/\/|www\.)/i.test(value), "درج لینک در دیدگاه مجاز نیست"),
});

export const blogCommentModerationSchema = z.object({
  commentId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
});
