import { z } from "zod";

/**
 * Server-side validation for Phase 12's public/customer-facing forms —
 * product review submission, newsletter signup, and the contact/support
 * form — kept separate from `lib/validation/auth.ts` (account mutations)
 * and `lib/validation/admin.ts` (staff-only mutations) since these three
 * are neither: reachable by any visitor (newsletter/contact) or by any
 * signed-in customer regardless of role (reviews). Same discipline as
 * every other validation module in this codebase: Server Actions call
 * `.safeParse()` on `FormData`-derived objects, never trusting a field
 * merely existed.
 */

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "امتیاز را انتخاب کنید").max(5, "امتیاز باید بین ۱ تا ۵ باشد"),
  title: z
    .union([z.string().trim().max(120), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  body: z.string().trim().min(10, "متن دیدگاه باید حداقل ۱۰ کاراکتر باشد").max(2000, "متن دیدگاه بیش از حد طولانی است"),
});

const emailField = z.string().trim().toLowerCase().email("ایمیل معتبر نیست");

export const newsletterSubscribeSchema = z.object({
  email: emailField,
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "نام را وارد کنید").max(120),
  email: emailField,
  mobile: z
    .union([z.string().trim().max(30), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  subject: z.string().trim().min(3, "موضوع را وارد کنید").max(160),
  message: z.string().trim().min(10, "متن پیام باید حداقل ۱۰ کاراکتر باشد").max(4000, "متن پیام بیش از حد طولانی است"),
});
