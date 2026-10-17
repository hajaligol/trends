import { toLatinDigits } from "@/lib/utils/digits";
import type { CampaignKind } from "@/lib/db/schema/campaigns";
import type { CampaignDefinition } from "@/domains/campaigns/config";

/**
 * The form edits numbers as strings (so a half-typed field is representable).
 * One flat draft serves every kind: switching kind keeps whatever fields the
 * new kind also uses. `draftToConfig` produces the object the server
 * validates — missing numbers become `undefined` so Zod reports them.
 */
export type Draft = {
  percent: string;
  maxDiscountToman: string;
  amountToman: string;
  priceToman: string;
  buyQty: string;
  getQty: string;
  qty: string;
  basis: "quantity" | "amount";
  tiers: Array<{ min: string; percent: string }>;
  minSpendToman: string;
  discountType: "percent" | "amount";
  value: string;
  includeExpress: boolean;
};

export const EMPTY_DRAFT: Draft = {
  percent: "",
  maxDiscountToman: "",
  amountToman: "",
  priceToman: "",
  buyQty: "2",
  getQty: "1",
  qty: "3",
  basis: "quantity",
  tiers: [
    { min: "2", percent: "10" },
    { min: "3", percent: "15" },
  ],
  minSpendToman: "",
  discountType: "percent",
  value: "",
  includeExpress: false,
};

const num = (value: string): number | undefined => {
  const cleaned = toLatinDigits(value).replace(/[,\s٬]/g, "");
  return cleaned === "" || Number.isNaN(Number(cleaned)) ? undefined : Number(cleaned);
};
const cap = (value: string) => num(value) ?? null;

export function draftToConfig(kind: CampaignKind, d: Draft): unknown {
  switch (kind) {
    case "percent_off":
      return { percent: num(d.percent), maxDiscountToman: cap(d.maxDiscountToman) };
    case "amount_off":
      return { amountToman: num(d.amountToman) };
    case "fixed_price":
      return { priceToman: num(d.priceToman) };
    case "buy_x_get_y_free":
      return { buyQty: num(d.buyQty), getQty: num(d.getQty) };
    case "buy_x_get_y_percent":
      return { buyQty: num(d.buyQty), getQty: num(d.getQty), percent: num(d.percent) };
    case "bundle_price":
      return { qty: num(d.qty), priceToman: num(d.priceToman) };
    case "tiered_discount":
      return {
        basis: d.basis,
        tiers: d.tiers.map((tier) => ({ min: num(tier.min), percent: num(tier.percent) })),
        maxDiscountToman: cap(d.maxDiscountToman),
      };
    case "basket_discount":
      return { minSpendToman: num(d.minSpendToman) ?? 0, type: d.discountType, value: num(d.value), maxDiscountToman: cap(d.maxDiscountToman) };
    case "free_shipping":
      return { minSpendToman: num(d.minSpendToman) ?? 0, includeExpress: d.includeExpress };
  }
}

const s = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));

/** Fills a draft from a saved campaign (edit mode). */
export function draftFromDefinition(def: CampaignDefinition | null): Draft {
  const d: Draft = { ...EMPTY_DRAFT, tiers: EMPTY_DRAFT.tiers.map((t) => ({ ...t })) };
  if (!def) return d;
  switch (def.kind) {
    case "percent_off":
      d.percent = s(def.config.percent);
      d.maxDiscountToman = s(def.config.maxDiscountToman);
      break;
    case "amount_off":
      d.amountToman = s(def.config.amountToman);
      break;
    case "fixed_price":
      d.priceToman = s(def.config.priceToman);
      break;
    case "buy_x_get_y_free":
      d.buyQty = s(def.config.buyQty);
      d.getQty = s(def.config.getQty);
      break;
    case "buy_x_get_y_percent":
      d.buyQty = s(def.config.buyQty);
      d.getQty = s(def.config.getQty);
      d.percent = s(def.config.percent);
      break;
    case "bundle_price":
      d.qty = s(def.config.qty);
      d.priceToman = s(def.config.priceToman);
      break;
    case "tiered_discount":
      d.basis = def.config.basis;
      d.tiers = def.config.tiers.map((t) => ({ min: s(t.min), percent: s(t.percent) }));
      d.maxDiscountToman = s(def.config.maxDiscountToman);
      break;
    case "basket_discount":
      d.minSpendToman = s(def.config.minSpendToman);
      d.discountType = def.config.type;
      d.value = s(def.config.value);
      d.maxDiscountToman = s(def.config.maxDiscountToman);
      break;
    case "free_shipping":
      d.minSpendToman = s(def.config.minSpendToman);
      d.includeExpress = def.config.includeExpress;
      break;
  }
  return d;
}
