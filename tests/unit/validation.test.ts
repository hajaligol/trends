import { describe, expect, it } from "vitest";
import { reviewSchema, newsletterSubscribeSchema, contactSchema } from "@/lib/validation/storefront";
import { mobileSchema, passwordSchema, addressSchema, registerSchema } from "@/lib/validation/auth";

describe("reviewSchema", () => {
  it("accepts a valid review", () => {
    const result = reviewSchema.safeParse({ rating: "5", title: "عالی بود", body: "کیفیت پارچه فوق‌العاده بود." });
    expect(result.success).toBe(true);
  });

  it("rejects a rating outside 1-5", () => {
    expect(reviewSchema.safeParse({ rating: "0", body: "این متن کافی است." }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: "6", body: "این متن کافی است." }).success).toBe(false);
  });

  it("rejects a body shorter than 10 characters (rules out empty/low-effort spam)", () => {
    expect(reviewSchema.safeParse({ rating: "5", body: "کوتاه" }).success).toBe(false);
  });

  it("allows an empty title, normalizing it to null", () => {
    const result = reviewSchema.safeParse({ rating: "4", title: "", body: "متن کافی برای دیدگاه است." });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBeNull();
  });
});

describe("newsletterSubscribeSchema", () => {
  it("accepts a valid email", () => {
    expect(newsletterSubscribeSchema.safeParse({ email: "person@example.com" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(newsletterSubscribeSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });

  it("lowercases and trims the email", () => {
    const result = newsletterSubscribeSchema.safeParse({ email: "  Person@Example.COM  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("person@example.com");
  });
});

describe("contactSchema", () => {
  it("accepts a full valid submission", () => {
    const result = contactSchema.safeParse({
      name: "علی",
      email: "ali@example.com",
      mobile: "09123456789",
      subject: "سوال درباره سفارش",
      message: "لطفا وضعیت سفارش من را بررسی کنید.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a message shorter than 10 characters", () => {
    const result = contactSchema.safeParse({
      name: "علی",
      email: "ali@example.com",
      subject: "سوال",
      message: "کوتاه",
    });
    expect(result.success).toBe(false);
  });

  it("allows mobile to be omitted", () => {
    const result = contactSchema.safeParse({
      name: "علی",
      email: "ali@example.com",
      subject: "سوال درباره سفارش",
      message: "لطفا وضعیت سفارش من را بررسی کنید.",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mobile).toBeNull();
  });
});

describe("mobileSchema (preprocessed with normalizeIranianMobile)", () => {
  it("accepts and normalizes a domestic-format number", () => {
    const result = mobileSchema.safeParse("09123456789");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("+989123456789");
  });

  it("rejects an unrecognizable number with a Persian error message", () => {
    const result = mobileSchema.safeParse("12345");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/شماره موبایل معتبر نیست/);
    }
  });
});

describe("passwordSchema", () => {
  it("rejects a password shorter than 8 characters", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
  });

  it("rejects a password longer than 72 characters (bcrypt's effective limit)", () => {
    expect(passwordSchema.safeParse("a".repeat(73)).success).toBe(false);
  });

  it("accepts a password within bounds", () => {
    expect(passwordSchema.safeParse("a-reasonable-password").success).toBe(true);
  });
});

describe("addressSchema", () => {
  const base = {
    recipientName: "علی رضایی",
    recipientMobile: "09123456789",
    province: "تهران",
    city: "تهران",
    addressLine: "خیابان ولیعصر، پلاک ۱۲۳",
    postalCode: "1234567890",
  };

  it("accepts a valid Iranian address", () => {
    expect(addressSchema.safeParse(base).success).toBe(true);
  });

  it("normalizes Persian-digit postal codes to ASCII and requires exactly 10 digits", () => {
    const result = addressSchema.safeParse({ ...base, postalCode: "۱۲۳۴۵۶۷۸۹۰" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.postalCode).toBe("1234567890");
  });

  it("rejects a postal code that isn't 10 digits", () => {
    expect(addressSchema.safeParse({ ...base, postalCode: "12345" }).success).toBe(false);
  });

  it("rejects an address line that's too short to be real", () => {
    expect(addressSchema.safeParse({ ...base, addressLine: "خیا" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("rejects mismatched password/confirmPassword", () => {
    const result = registerSchema.safeParse({
      mobile: "09123456789",
      fullName: "علی رضایی",
      password: "password123",
      confirmPassword: "different123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("confirmPassword"))).toBe(true);
    }
  });

  it("accepts matching passwords and an optional-omitted email normalized to null", () => {
    const result = registerSchema.safeParse({
      mobile: "09123456789",
      fullName: "علی رضایی",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBeNull();
  });
});
