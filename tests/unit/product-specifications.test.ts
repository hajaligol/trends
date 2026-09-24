import { describe, expect, it } from "vitest";
import { productSpecificationsSchema } from "@/lib/validation/admin";
import { normalizeSpecLabel } from "@/lib/utils/spec-label";
import { MAX_SPEC_ROWS } from "@/lib/validation/spec-limits";

describe("productSpecificationsSchema", () => {
  it("accepts valid rows and trims them", () => {
    const result = productSpecificationsSchema.safeParse([{ label: "  قد مدل ", value: " ۱۸۵ سانتی‌متر " }]);
    expect(result.success && result.data).toEqual([{ label: "قد مدل", value: "۱۸۵ سانتی‌متر" }]);
  });

  it("drops fully blank rows instead of failing", () => {
    const result = productSpecificationsSchema.safeParse([
      { label: "", value: "" },
      { label: "طرح", value: "ساده" },
      { label: "   ", value: "  " },
    ]);
    expect(result.success && result.data).toEqual([{ label: "طرح", value: "ساده" }]);
  });

  it("rejects a half-filled row", () => {
    expect(productSpecificationsSchema.safeParse([{ label: "طرح", value: "" }]).success).toBe(false);
    expect(productSpecificationsSchema.safeParse([{ label: "", value: "ساده" }]).success).toBe(false);
  });

  it("rejects duplicate labels, ignoring case, spacing and Arabic ی/ک variants", () => {
    expect(
      productSpecificationsSchema.safeParse([
        { label: "Fit", value: "a" },
        { label: " fit ", value: "b" },
      ]).success,
    ).toBe(false);
    expect(
      productSpecificationsSchema.safeParse([
        { label: "نوع کاپشن", value: "a" },
        { label: "نوع كاپشن", value: "b" },
      ]).success,
    ).toBe(false);
  });

  it("enforces length limits", () => {
    expect(productSpecificationsSchema.safeParse([{ label: "a".repeat(81), value: "x" }]).success).toBe(false);
    expect(productSpecificationsSchema.safeParse([{ label: "a", value: "x".repeat(501) }]).success).toBe(false);
  });

  it("enforces the maximum number of filled rows", () => {
    const rows = (count: number) => Array.from({ length: count }, (_, i) => ({ label: `l${i}`, value: "v" }));
    expect(productSpecificationsSchema.safeParse(rows(MAX_SPEC_ROWS)).success).toBe(true);
    expect(productSpecificationsSchema.safeParse(rows(MAX_SPEC_ROWS + 1)).success).toBe(false);
  });
});

describe("normalizeSpecLabel", () => {
  it("makes visually identical labels compare equal", () => {
    expect(normalizeSpecLabel("  جنس  ")).toBe(normalizeSpecLabel("جنس"));
    expect(normalizeSpecLabel("كيف")).toBe(normalizeSpecLabel("کیف"));
  });
});
