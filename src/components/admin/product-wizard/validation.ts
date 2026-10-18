import { MAX_CREATE_PRODUCT_IMAGES, productSpecificationsSchema, sizeChartSchema } from "@/lib/validation/admin";

/**
 * Per-stage checks for the staged "new product" form. These only decide
 * whether the operator may move on to the next stage — they are a UX
 * convenience. `createProductAction` re-validates everything on the server.
 */

export const PRODUCT_STEPS = [
  { id: "basics", title: "اطلاعات اصلی" },
  { id: "category", title: "دسته‌بندی و برند" },
  { id: "variants", title: "سایز و رنگ" },
  { id: "images", title: "تصاویر" },
  { id: "specs", title: "جدول مشخصات" },
  { id: "sizeChart", title: "جدول سایز" },
  { id: "display", title: "نمایش و سئو" },
  { id: "review", title: "مرور و ساخت" },
] as const;

export type ProductStepId = (typeof PRODUCT_STEPS)[number]["id"];

export type DraftImage = {
  /** Client-only key for React lists; never sent to the server. */
  key: string;
  url: string;
  altText: string;
  /** Colour name, or "" for "all colours". */
  color: string;
  isPrimary: boolean;
};

export type ProductWizardValues = {
  title: string;
  shortDescription: string;
  longDescription: string;
  categoryId: string;
  seoTitle: string;
  seoDescription: string;
  variants: { rowCount: number; colorNames: string[]; incomplete: boolean };
  images: DraftImage[];
  /** Raw custom spec rows as typed (blank rows are dropped by the schema). */
  specRows: Array<{ label: string; value: string }>;
  /** Raw size-chart fields as posted by the editor. */
  sizeChart: { columns: string[]; cells: string[]; note: string };
};

export function validateProductStep(step: ProductStepId, values: ProductWizardValues): string | null {
  switch (step) {
    case "basics":
      if (values.title.trim() === "") return "عنوان محصول را وارد کنید.";
      if (values.title.trim().length > 200) return "عنوان محصول حداکثر ۲۰۰ نویسه می‌تواند باشد.";
      if (values.shortDescription.trim().length > 500) return "توضیح کوتاه حداکثر ۵۰۰ نویسه می‌تواند باشد.";
      if (values.longDescription.trim().length > 5000) return "توضیح کامل حداکثر ۵۰۰۰ نویسه می‌تواند باشد.";
      return null;
    case "category":
      return values.categoryId === "" ? "دسته‌بندی محصول را تا آخرین سطح انتخاب کنید." : null;
    case "variants":
      return values.variants.incomplete
        ? "قیمت و موجودی همه‌ی ردیف‌های انواع را وارد کنید (موجودی ۰ هم قابل قبول است)، یا انتخاب سایز و رنگ را خالی بگذارید."
        : null;
    case "images": {
      if (values.images.length > MAX_CREATE_PRODUCT_IMAGES) return `حداکثر ${MAX_CREATE_PRODUCT_IMAGES} تصویر مجاز است.`;
      const orphan = values.images.find((image) => image.color !== "" && !values.variants.colorNames.includes(image.color));
      if (orphan) return `رنگ «${orphan.color}» دیگر در انواع محصول نیست؛ رنگ آن تصویر را عوض کنید یا تصویر را حذف کنید.`;
      return null;
    }
    case "specs": {
      const parsed = productSpecificationsSchema.safeParse(values.specRows);
      return parsed.success ? null : (parsed.error.issues[0]?.message ?? "اطلاعات جدول مشخصات معتبر نیست");
    }
    case "sizeChart": {
      const parsed = sizeChartSchema.safeParse(values.sizeChart);
      return parsed.success ? null : (parsed.error.issues[0]?.message ?? "اطلاعات جدول سایز معتبر نیست");
    }
    case "display":
      if (values.seoTitle.trim().length > 160) return "عنوان سئو حداکثر ۱۶۰ نویسه می‌تواند باشد.";
      if (values.seoDescription.trim().length > 300) return "توضیح سئو حداکثر ۳۰۰ نویسه می‌تواند باشد.";
      return null;
    case "review":
      return null;
  }
}

/** Index of the first stage that fails validation, or -1. Used before the final save. */
export function firstInvalidProductStep(values: ProductWizardValues): { index: number; error: string } | null {
  for (let index = 0; index < PRODUCT_STEPS.length; index += 1) {
    const error = validateProductStep(PRODUCT_STEPS[index]?.id ?? "review", values);
    if (error) return { index, error };
  }
  return null;
}

/** Serialises the draft for the `imagesJson` form field (client keys dropped). */
export function imagesToJson(images: DraftImage[]): string {
  if (images.length === 0) return "";
  return JSON.stringify(
    images.map((image) => ({
      url: image.url,
      altText: image.altText.trim(),
      color: image.color === "" ? null : image.color,
      isPrimary: image.isPrimary,
    })),
  );
}

/** Number of filled spec rows / size-chart rows, for the review stage. Zero when invalid or empty. */
export function countSpecRows(values: Pick<ProductWizardValues, "specRows">): number {
  const parsed = productSpecificationsSchema.safeParse(values.specRows);
  return parsed.success ? parsed.data.length : 0;
}

export function countSizeChartRows(values: Pick<ProductWizardValues, "sizeChart">): number {
  const parsed = sizeChartSchema.safeParse(values.sizeChart);
  return parsed.success && parsed.data ? parsed.data.rows.length : 0;
}
