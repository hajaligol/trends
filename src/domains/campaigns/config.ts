import { z } from "zod";
import type { CampaignKind } from "@/lib/db/schema/campaigns";

/**
 * Per-kind configuration of a sale campaign. Everything is an integer
 * (percentages are whole numbers, money is Toman) — there is no float math
 * anywhere in campaign pricing. These schemas are the single definition used
 * by the admin form (write) AND when campaigns are loaded for pricing
 * (read), so a hand-edited / corrupt row can never be applied.
 */

const MAX_TOMAN = 2_000_000_000; // stay inside Postgres `integer`
const toman = (label: string) =>
  z
    .number({ error: `${label} را وارد کنید` })
    .int(`${label} باید عدد صحیح باشد`)
    .min(0, `${label} نمی‌تواند منفی باشد`)
    .max(MAX_TOMAN, `${label} بیش از حد بزرگ است`);
const positiveToman = (label: string) => toman(label).min(1, `${label} باید بزرگ‌تر از صفر باشد`);
const percent = (label: string) =>
  z
    .number({ error: `${label} را وارد کنید` })
    .int(`${label} باید عدد صحیح باشد`)
    .min(1, `${label} باید حداقل ۱ باشد`)
    .max(99, `${label} باید حداکثر ۹۹ باشد`);
const qty = (label: string, max = 20) =>
  z
    .number({ error: `${label} را وارد کنید` })
    .int(`${label} باید عدد صحیح باشد`)
    .min(1, `${label} باید حداقل ۱ باشد`)
    .max(max, `${label} باید حداکثر ${max} باشد`);
const optionalCap = z.number().int().min(1).max(MAX_TOMAN).nullable().default(null);

export const percentOffConfig = z.object({ percent: percent("درصد تخفیف"), maxDiscountToman: optionalCap });
export const amountOffConfig = z.object({ amountToman: positiveToman("مبلغ تخفیف") });
export const fixedPriceConfig = z.object({ priceToman: toman("قیمت ثابت") });
export const buyXGetYFreeConfig = z.object({ buyQty: qty("تعداد خرید", 10), getQty: qty("تعداد رایگان", 10) });
export const buyXGetYPercentConfig = z.object({
  buyQty: qty("تعداد خرید", 10),
  getQty: qty("تعداد تخفیف‌دار", 10),
  percent: percent("درصد تخفیف"),
});
export const bundlePriceConfig = z.object({
  qty: qty("تعداد کالا در بسته", 20).min(2, "تعداد کالا در بسته باید حداقل ۲ باشد"),
  priceToman: toman("قیمت بسته"),
});
export const tieredDiscountConfig = z
  .object({
    basis: z.enum(["quantity", "amount"]),
    tiers: z
      .array(z.object({ min: positiveToman("حداقل"), percent: percent("درصد تخفیف") }))
      .min(1, "حداقل یک پله لازم است")
      .max(6, "حداکثر ۶ پله مجاز است"),
    maxDiscountToman: optionalCap,
  })
  .refine(
    (cfg) => cfg.tiers.every((tier, i) => i === 0 || (tier.min > cfg.tiers[i - 1]!.min && tier.percent > cfg.tiers[i - 1]!.percent)),
    { message: "هر پله باید حداقل و درصد بیشتری از پله قبلی داشته باشد" },
  );
export const basketDiscountConfig = z
  .object({
    minSpendToman: toman("حداقل خرید"),
    type: z.enum(["percent", "amount"]),
    value: positiveToman("مقدار تخفیف"),
    maxDiscountToman: optionalCap,
  })
  .refine((cfg) => cfg.type !== "percent" || cfg.value <= 99, { message: "درصد تخفیف باید حداکثر ۹۹ باشد", path: ["value"] });
export const freeShippingConfig = z.object({
  minSpendToman: toman("حداقل خرید"),
  includeExpress: z.boolean().default(false),
});

export const CONFIG_SCHEMAS = {
  percent_off: percentOffConfig,
  amount_off: amountOffConfig,
  fixed_price: fixedPriceConfig,
  buy_x_get_y_free: buyXGetYFreeConfig,
  buy_x_get_y_percent: buyXGetYPercentConfig,
  bundle_price: bundlePriceConfig,
  tiered_discount: tieredDiscountConfig,
  basket_discount: basketDiscountConfig,
  free_shipping: freeShippingConfig,
} as const satisfies Record<CampaignKind, z.ZodType>;

export type CampaignConfigMap = { [K in CampaignKind]: z.infer<(typeof CONFIG_SCHEMAS)[K]> };

/** A kind + its matching config, as a discriminated union. */
export type CampaignDefinition = { [K in CampaignKind]: { kind: K; config: CampaignConfigMap[K] } }[CampaignKind];

export const PRICE_LEVEL_KINDS = ["percent_off", "amount_off", "fixed_price"] as const;
export type PriceLevelKind = (typeof PRICE_LEVEL_KINDS)[number];

export function isPriceLevelKind(kind: CampaignKind): kind is PriceLevelKind {
  return (PRICE_LEVEL_KINDS as readonly string[]).includes(kind);
}

export type ParsedDefinition = { ok: true; definition: CampaignDefinition } | { ok: false; error: string };

/** Validates `raw` against the schema of `kind`. Never throws. */
export function parseCampaignConfig(kind: CampaignKind, raw: unknown): ParsedDefinition {
  const schema = CONFIG_SCHEMAS[kind];
  if (!schema) return { ok: false, error: "نوع کمپین معتبر نیست" };
  const result = schema.safeParse(raw);
  if (!result.success) return { ok: false, error: result.error.issues[0]?.message ?? "تنظیمات کمپین معتبر نیست" };
  return { ok: true, definition: { kind, config: result.data } as CampaignDefinition };
}
