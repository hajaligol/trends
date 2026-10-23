import { describe, expect, it } from "vitest";
import { parseCreateImagesField, MAX_CREATE_PRODUCT_IMAGES } from "@/lib/validation/admin";
import {
  countSizeChartRows,
  countSpecRows,
  firstInvalidProductStep,
  imagesToJson,
  validateProductStep,
  type ProductWizardValues,
} from "@/components/admin/product-wizard/validation";
import {
  firstInvalidCampaignStep,
  validateCampaignStep,
  type CampaignStepValues,
} from "@/components/admin/campaign/steps";

const goodProduct: ProductWizardValues = {
  title: "پیراهن کلاسیک",
  shortDescription: "",
  longDescription: "",
  categoryId: "3f1c2b6e-0000-4000-8000-000000000001",
  seoTitle: "",
  seoDescription: "",
  variants: { rowCount: 2, colorNames: ["مشکی", "سفید"], incomplete: false },
  images: [],
  specRows: [],
  sizeChart: { columns: [], cells: [], note: "" },
};

describe("product wizard step validation", () => {
  it("requires a title and a category before moving on", () => {
    expect(validateProductStep("basics", { ...goodProduct, title: "   " })).toMatch(/عنوان/);
    expect(validateProductStep("category", { ...goodProduct, categoryId: "" })).toMatch(/دسته/);
    expect(firstInvalidProductStep(goodProduct)).toBeNull();
  });

  it("blocks the variants stage while a price/stock cell is empty, but allows no variants at all", () => {
    expect(validateProductStep("variants", { ...goodProduct, variants: { rowCount: 3, colorNames: ["مشکی"], incomplete: true } })).toMatch(/قیمت/);
    expect(validateProductStep("variants", { ...goodProduct, variants: { rowCount: 0, colorNames: [], incomplete: false } })).toBeNull();
  });

  it("flags an image whose colour was removed from the variants", () => {
    const images = [{ key: "a", url: "/u/a.webp", altText: "x", color: "قرمز", isPrimary: true }];
    expect(validateProductStep("images", { ...goodProduct, images })).toMatch(/قرمز/);
    expect(validateProductStep("images", { ...goodProduct, images: [{ ...images[0]!, color: "مشکی" }] })).toBeNull();
  });

  it("reports the first failing stage index", () => {
    expect(firstInvalidProductStep({ ...goodProduct, categoryId: "", seoTitle: "x".repeat(161) })?.index).toBe(1);
  });

  it("accepts empty spec rows and drops blank ones, but rejects half-filled and duplicate rows", () => {
    expect(validateProductStep("specs", goodProduct)).toBeNull();
    const blank = { ...goodProduct, specRows: [{ label: "", value: "" }] };
    expect(validateProductStep("specs", blank)).toBeNull();
    expect(countSpecRows(blank)).toBe(0);
    expect(validateProductStep("specs", { ...goodProduct, specRows: [{ label: "قد مدل", value: "" }] })).toMatch(/هم عنوان و هم مقدار/);
    expect(
      validateProductStep("specs", { ...goodProduct, specRows: [{ label: "قد مدل", value: "۱۸۵" }, { label: "قد مدل", value: "۱۹۰" }] }),
    ).toMatch(/بیش از یک بار/);
    expect(countSpecRows({ specRows: [{ label: "قد مدل", value: "۱۸۵ سانتی‌متر" }] })).toBe(1);
  });

  it("treats an absent size chart as valid and checks a filled one", () => {
    expect(validateProductStep("sizeChart", goodProduct)).toBeNull();
    expect(countSizeChartRows(goodProduct)).toBe(0);
    const chart = { columns: ["سایز", "دور سینه"], cells: ["M", "۹۸", "L", "۱۰۲"], note: "" };
    expect(validateProductStep("sizeChart", { ...goodProduct, sizeChart: chart })).toBeNull();
    expect(countSizeChartRows({ sizeChart: chart })).toBe(2);
    // headings but no filled row → error instead of saving junk
    expect(validateProductStep("sizeChart", { ...goodProduct, sizeChart: { columns: ["سایز"], cells: [""], note: "" } })).toMatch(/حداقل یک ردیف/);
    // duplicate headings
    expect(validateProductStep("sizeChart", { ...goodProduct, sizeChart: { columns: ["سایز", "سایز"], cells: ["M", "L"], note: "" } })).toMatch(/تکراری/);
  });

  it("serialises images without client keys, empty colour as null", () => {
    expect(imagesToJson([])).toBe("");
    const json = JSON.parse(imagesToJson([{ key: "k", url: "/u.webp", altText: " alt ", color: "", isPrimary: true }]));
    expect(json).toEqual([{ url: "/u.webp", altText: "alt", color: null, isPrimary: true }]);
  });
});

describe("parseCreateImagesField (server side)", () => {
  const colors = ["مشکی", "سفید"];
  const row = (extra: object = {}) => ({ url: "/assets/products/a.webp", altText: "alt", ...extra });

  it("treats blank input as no images", () => {
    expect(parseCreateImagesField(null, colors)).toEqual({ ok: true, value: [] });
    expect(parseCreateImagesField("", colors)).toEqual({ ok: true, value: [] });
    expect(parseCreateImagesField("[]", colors)).toEqual({ ok: true, value: [] });
  });

  it("assigns displayOrder from array order and exactly one primary", () => {
    const result = parseCreateImagesField(JSON.stringify([row(), row({ isPrimary: true }), row({ isPrimary: true })]), colors);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((image) => image.displayOrder)).toEqual([0, 1, 2]);
    expect(result.value.map((image) => image.isPrimary)).toEqual([false, true, false]);
  });

  it("makes the first image primary when none is flagged", () => {
    const result = parseCreateImagesField(JSON.stringify([row(), row()]), colors);
    expect(result.ok && result.value.map((image) => image.isPrimary)).toEqual([true, false]);
  });

  it("rejects a colour that no created variant has", () => {
    expect(parseCreateImagesField(JSON.stringify([row({ color: "قرمز" })]), colors).ok).toBe(false);
    expect(parseCreateImagesField(JSON.stringify([row({ color: "مشکی" })]), colors).ok).toBe(true);
    expect(parseCreateImagesField(JSON.stringify([row({ color: "مشکی" })]), []).ok).toBe(false);
  });

  it("rejects missing alt text, bad JSON and too many images", () => {
    expect(parseCreateImagesField(JSON.stringify([{ url: "/u.webp", altText: " " }]), colors).ok).toBe(false);
    expect(parseCreateImagesField("{oops", colors).ok).toBe(false);
    const many = Array.from({ length: MAX_CREATE_PRODUCT_IMAGES + 1 }, () => row());
    expect(parseCreateImagesField(JSON.stringify(many), colors).ok).toBe(false);
  });
});

const goodCampaign: CampaignStepValues = {
  name: "حراج پاییزه",
  description: "",
  configError: null,
  hasTargets: true,
  startsAt: "",
  endsAt: "",
  showCountdown: false,
  homePlacement: "none",
  homeImageUrl: "",
};

describe("campaign wizard step validation", () => {
  it("passes a complete campaign", () => {
    expect(firstInvalidCampaignStep(goodCampaign)).toBeNull();
  });

  it("gates each stage", () => {
    expect(validateCampaignStep("basics", { ...goodCampaign, name: " " })).toMatch(/نام/);
    expect(validateCampaignStep("discount", { ...goodCampaign, configError: "درصد لازم است" })).toMatch(/درصد/);
    expect(validateCampaignStep("scope", { ...goodCampaign, hasTargets: false })).toMatch(/کل فروشگاه/);
    expect(validateCampaignStep("home", { ...goodCampaign, homePlacement: "hero" })).toMatch(/تصویر/);
    expect(validateCampaignStep("home", { ...goodCampaign, homePlacement: "hero", homeImageUrl: "/h.webp" })).toBeNull();
  });

  it("checks schedule order and countdown needing an end time", () => {
    expect(validateCampaignStep("schedule", { ...goodCampaign, startsAt: "2026-10-20T10:00", endsAt: "2026-10-20T09:00" })).toMatch(/بعد از/);
    expect(validateCampaignStep("schedule", { ...goodCampaign, showCountdown: true })).toMatch(/پایان/);
    expect(validateCampaignStep("schedule", { ...goodCampaign, startsAt: "2026-10-20T10:00", endsAt: "2026-10-21T10:00", showCountdown: true })).toBeNull();
  });

  it("reports the first failing stage", () => {
    expect(firstInvalidCampaignStep({ ...goodCampaign, hasTargets: false, homePlacement: "banner" })?.index).toBe(2);
  });
});
