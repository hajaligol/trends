import { z } from "zod";
import { normalizeIranianMobile, toAsciiDigits } from "@/lib/utils/phone";

/**
 * Server-side validation for every auth mutation (registration, login,
 * password reset, address book), per CLAUDE_BUILD_INSTRUCTIONS.txt rule
 * A.9 ("Use server-side validation for every mutation") and E "Server
 * Actions still require ... input validation". These schemas are the
 * single source of truth — Server Actions call `.safeParse()` on raw
 * `FormData`-derived objects and never trust a value just because a form
 * field existed.
 */

// `z.preprocess` so a raw "۰۹۱۲..." or "+98 912 345 6789" typed by the
// user is normalized *before* validation runs, and the normalized
// `+98XXXXXXXXXX` value is what actually gets stored — never the raw
// input string.
export const mobileSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return normalizeIranianMobile(value) ?? value;
}, z.string().regex(/^\+989\d{9}$/, "شماره موبایل معتبر نیست. مثال: ۰۹۱۲۳۴۵۶۷۸۹"));

export const passwordSchema = z
  .string()
  .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
  .max(72, "رمز عبور بیش از حد طولانی است"); // bcrypt truncates/ignores bytes beyond 72.

export const registerSchema = z
  .object({
    mobile: mobileSchema,
    fullName: z.string().trim().min(2, "نام را وارد کنید").max(120),
    email: z
      .union([z.string().trim().toLowerCase().email("ایمیل معتبر نیست"), z.literal("")])
      .optional()
      .transform((value) => (value ? value : null)),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "رمز عبور و تکرار آن یکسان نیستند",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  mobile: mobileSchema,
  password: z.string().min(1, "رمز عبور را وارد کنید"),
});

export const forgotPasswordSchema = z.object({
  mobile: mobileSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "رمز عبور و تکرار آن یکسان نیستند",
    path: ["confirmPassword"],
  });

export const addressSchema = z.object({
  recipientName: z.string().trim().min(2, "نام گیرنده را وارد کنید").max(120),
  recipientMobile: mobileSchema,
  province: z.string().trim().min(2, "استان را وارد کنید").max(80),
  city: z.string().trim().min(2, "شهر را وارد کنید").max(80),
  addressLine: z.string().trim().min(5, "آدرس را کامل وارد کنید").max(500),
  postalCode: z.preprocess(
    (value) => (typeof value === "string" ? toAsciiDigits(value.trim()) : value),
    z.string().regex(/^\d{10}$/, "کد پستی باید ۱۰ رقم باشد"),
  ),
  plaqueUnitDetails: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value ? value : null)),
  deliveryNotes: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => (value ? value : null)),
  isDefault: z.boolean().optional().default(false),
});
