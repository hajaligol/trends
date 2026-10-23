import { z } from "zod";
import { campaignKindEnum } from "@/lib/db/schema/campaigns";
import { parseCampaignConfig, type CampaignDefinition } from "./config";
import { tehranInputToDate } from "@/lib/utils/tehran-time";
import { isValidHomeImagePath } from "./home-image";

/**
 * Everything the campaign form submits, as ONE JSON payload (the form has
 * repeating rows and pickers, which plain form fields model badly). The
 * server validates it from scratch — the client form is a convenience, not a
 * trust boundary.
 */

const ids = (max: number) => z.array(z.uuid()).max(max, "تعداد موارد انتخاب‌شده بیش از حد است");

/** Tehran wall-clock "YYYY-MM-DDTHH:mm" or empty → Date | null. */
const tehranDateTime = z
  .string()
  .nullable()
  .transform((value, ctx) => {
    if (!value) return null;
    const date = tehranInputToDate(value);
    if (!date) {
      ctx.addIssue({ code: "custom", message: "تاریخ واردشده معتبر نیست" });
      return z.NEVER;
    }
    return date;
  });

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} حداکثر ${max} کاراکتر باشد`)
    .nullable()
    .transform((value) => value || null);

const scopeShape = {
  appliesToAll: z.boolean(),
  brandIds: ids(300),
  categoryIds: ids(300),
  productIds: ids(1000),
  excludedProductIds: ids(1000),
};

export const campaignInputSchema = z
  .object({
    name: z.string().trim().min(2, "نام کمپین را وارد کنید").max(60, "نام کمپین حداکثر ۶۰ کاراکتر باشد"),
    description: z
      .string()
      .trim()
      .max(160, "توضیح حداکثر ۱۶۰ کاراکتر باشد")
      .nullable()
      .transform((value) => value || null),
    kind: z.enum(campaignKindEnum.enumValues),
    config: z.unknown(),
    ...scopeShape,
    stackable: z.boolean(),
    showCountdown: z.boolean(),
    isActive: z.boolean(),
    // Omitted ⇒ "no homepage display", so older clients keep working.
    homePlacement: z.enum(["none", "hero", "banner"]).default("none"),
    homeImageUrl: z
      .string()
      .trim()
      .nullable()
      .default(null)
      .transform((value) => value || null),
    // Optional phone version of the homepage hero slide (hero placement only).
    homeMobileImageUrl: z
      .string()
      .trim()
      .nullable()
      .default(null)
      .transform((value) => value || null),
    // Optional image for the sale page's own hero; empty ⇒ the text hero is used.
    heroImageUrl: z
      .string()
      .trim()
      .nullable()
      .default(null)
      .transform((value) => value || null),
    homeBannerTone: z.enum(["pink", "blue"]).default("pink"),
    homeTitle: optionalText(120, "عنوان بنر").default(null),
    homeDescription: optionalText(400, "توضیح بنر").default(null),
    homeCtaLabel: optionalText(60, "متن دکمه").default(null),
    startsAt: tehranDateTime,
    endsAt: tehranDateTime,
  })
  .transform((input, ctx) => {
    const parsed = parseCampaignConfig(input.kind, input.config);
    if (!parsed.ok) {
      ctx.addIssue({ code: "custom", message: parsed.error, path: ["config"] });
      return z.NEVER;
    }
    return { ...input, definition: parsed.definition as CampaignDefinition };
  })
  .superRefine((input, ctx) => {
    if (input.startsAt && input.endsAt && input.startsAt >= input.endsAt) {
      ctx.addIssue({ code: "custom", message: "زمان پایان باید بعد از زمان شروع باشد", path: ["endsAt"] });
    }
    if (input.showCountdown && !input.endsAt) {
      ctx.addIssue({ code: "custom", message: "برای نمایش شمارش معکوس، زمان پایان را مشخص کنید", path: ["endsAt"] });
    }
    if (input.homePlacement !== "none") {
      if (!input.homeImageUrl) {
        ctx.addIssue({
          code: "custom",
          message: input.homePlacement === "hero" ? "برای اسلاید صفحه اصلی، تصویر انتخاب کنید" : "برای بنر صفحه اصلی، تصویر انتخاب کنید",
          path: ["homeImageUrl"],
        });
      } else if (!isValidHomeImagePath(input.homeImageUrl)) {
        ctx.addIssue({ code: "custom", message: "تصویر باید از طریق «انتخاب فایل» بارگذاری شده باشد", path: ["homeImageUrl"] });
      }
    }
    if (input.homeMobileImageUrl && !isValidHomeImagePath(input.homeMobileImageUrl)) {
      ctx.addIssue({ code: "custom", message: "تصویر باید از طریق «انتخاب فایل» بارگذاری شده باشد", path: ["homeMobileImageUrl"] });
    }
    if (input.heroImageUrl && !isValidHomeImagePath(input.heroImageUrl)) {
      ctx.addIssue({ code: "custom", message: "تصویر باید از طریق «انتخاب فایل» بارگذاری شده باشد", path: ["heroImageUrl"] });
    }
    const includeCount = input.brandIds.length + input.categoryIds.length + input.productIds.length;
    if (!input.appliesToAll && includeCount === 0) {
      ctx.addIssue({
        code: "custom",
        message: "حداقل یک برند، دسته‌بندی یا محصول انتخاب کنید (یا «کل فروشگاه» را برگزینید)",
        path: ["appliesToAll"],
      });
    }
  });

export type CampaignInput = z.output<typeof campaignInputSchema>;

/** What the live preview needs: the offer and who it covers. */
export const campaignPreviewSchema = z.object({
  kind: z.enum(campaignKindEnum.enumValues),
  config: z.unknown(),
  ...scopeShape,
  excludeCampaignId: z.uuid().nullable(),
});
export type CampaignPreviewInput = z.output<typeof campaignPreviewSchema>;

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "اطلاعات وارد شده معتبر نیست";
}
