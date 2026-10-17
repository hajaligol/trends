import { isPriceLevelKind, type CampaignDefinition } from "./config";

/**
 * Pure sale-campaign pricing engine: no database, no clock, no I/O — given
 * cart lines and the already-loaded active campaigns it returns exact integer
 * Toman discounts. Cart display, checkout and order creation all call this
 * one function, so what the customer sees is what the order stores.
 *
 * Evaluation order (documented for operators in docs/SALE_CAMPAIGNS.md):
 *
 * 1. PRICE-LEVEL campaigns (percent_off, amount_off, fixed_price) — per
 *    line, the single campaign giving the LOWEST price wins (ties: the older
 *    campaign). Price-level campaigns never compound with each other.
 * 2. CART-LEVEL campaigns (buy X get Y, bundle price, tiered, basket
 *    discount) — applied greedily: at each step the campaign that saves the
 *    customer the most on the units still available is applied, until none
 *    saves anything. A campaign is applied at most once, and every unit that
 *    takes part in it is "touched".
 * 3. FREE SHIPPING — decided last, from what the eligible lines actually cost.
 *
 * Stacking rule: a unit that was touched by campaign A may be used by
 * campaign B only if BOTH A and B are `stackable`. Default (non-stackable)
 * therefore means "sale items are excluded from other offers".
 *
 * All arithmetic is on integers. Percentages use floor (never rounds up in
 * the customer's favour by accident); multi-unit discounts are split with the
 * largest-remainder method so the parts always sum exactly to the whole.
 */

export type CampaignScope = {
  appliesToAll: boolean;
  brandIds: ReadonlySet<string>;
  /** Already expanded to include every descendant category. */
  categoryIds: ReadonlySet<string>;
  productIds: ReadonlySet<string>;
  excludedBrandIds: ReadonlySet<string>;
  excludedCategoryIds: ReadonlySet<string>;
  excludedProductIds: ReadonlySet<string>;
};

type CampaignBase = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  stackable: boolean;
  showCountdown: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  scope: CampaignScope;
};
export type EngineCampaign = CampaignBase & CampaignDefinition;

export type ProductRef = { productId: string; brandId: string | null; categoryId: string };

export type EngineLineInput = ProductRef & {
  lineId: string;
  /** Regular unit price (the variant's current price), integer Toman. */
  unitPriceToman: number;
  quantity: number;
};

export type EngineLineResult = {
  lineId: string;
  unitPriceToman: number;
  quantity: number;
  grossToman: number;
  discountToman: number;
  payableToman: number;
  campaignNames: string[];
};

export type AppliedCampaign = { campaignId: string; name: string; kind: EngineCampaign["kind"]; discountToman: number };

export type FreeShippingResult = { campaignId: string; name: string; includeExpress: boolean };

export type EngineResult = {
  lines: EngineLineResult[];
  applied: AppliedCampaign[];
  grossToman: number;
  campaignDiscountToman: number;
  /** Items total the customer pays (after campaigns, before coupon/shipping). */
  subtotalToman: number;
  freeShipping: FreeShippingResult | null;
};

// ---------------------------------------------------------------------
// Scope matching
// ---------------------------------------------------------------------

export function campaignCoversProduct(scope: CampaignScope, ref: ProductRef): boolean {
  if (
    scope.excludedProductIds.has(ref.productId) ||
    (ref.brandId !== null && scope.excludedBrandIds.has(ref.brandId)) ||
    scope.excludedCategoryIds.has(ref.categoryId)
  ) {
    return false;
  }
  if (scope.appliesToAll) return true;
  return (
    scope.productIds.has(ref.productId) ||
    (ref.brandId !== null && scope.brandIds.has(ref.brandId)) ||
    scope.categoryIds.has(ref.categoryId)
  );
}

const byAge = (a: { createdAt: Date; id: string }, b: { createdAt: Date; id: string }) =>
  a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// ---------------------------------------------------------------------
// Integer helpers
// ---------------------------------------------------------------------

const percentOf = (amount: number, percent: number) => Math.floor((amount * percent) / 100);

/**
 * Splits `total` across `weights` proportionally with the largest-remainder
 * method. The result is integers summing to exactly `min(total, Σweights)`,
 * and no share exceeds its own weight. BigInt keeps the products exact.
 */
export function allocateProportionally(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);
  const t = BigInt(Math.min(total, sum));
  const bigSum = BigInt(sum);
  const parts = weights.map((w, i) => {
    const product = t * BigInt(w);
    return { i, share: Number(product / bigSum), remainder: product % bigSum };
  });
  let leftover = Number(t) - parts.reduce((a, p) => a + p.share, 0);
  const order = [...parts].sort((a, b) => (a.remainder === b.remainder ? a.i - b.i : a.remainder > b.remainder ? -1 : 1));
  for (const part of order) {
    if (leftover <= 0) break;
    if (part.share < weights[part.i]!) {
      part.share += 1;
      leftover -= 1;
    }
  }
  return parts.map((p) => p.share);
}

// ---------------------------------------------------------------------
// Stage 1 — price-level campaigns (also used by catalog display)
// ---------------------------------------------------------------------

export function priceAfterPriceCampaign(def: CampaignDefinition, basePrice: number): number {
  switch (def.kind) {
    case "percent_off": {
      const raw = percentOf(basePrice, def.config.percent);
      const discount = def.config.maxDiscountToman ? Math.min(raw, def.config.maxDiscountToman) : raw;
      return basePrice - discount;
    }
    case "amount_off":
      return Math.max(0, basePrice - def.config.amountToman);
    case "fixed_price":
      return Math.min(basePrice, def.config.priceToman);
    default:
      return basePrice;
  }
}

/** The best price-level campaign for one unit, or `null` if none lowers the price. */
export function bestPriceCampaign(
  campaigns: readonly EngineCampaign[],
  ref: ProductRef,
  basePrice: number,
): { campaign: EngineCampaign; priceToman: number } | null {
  let best: { campaign: EngineCampaign; priceToman: number } | null = null;
  for (const campaign of campaigns) {
    if (!isPriceLevelKind(campaign.kind) || !campaignCoversProduct(campaign.scope, ref)) continue;
    const price = priceAfterPriceCampaign(campaign, basePrice);
    if (price >= basePrice) continue;
    if (!best || price < best.priceToman || (price === best.priceToman && byAge(campaign, best.campaign) < 0)) {
      best = { campaign, priceToman: price };
    }
  }
  return best;
}

// ---------------------------------------------------------------------
// Stage 2 — cart-level campaigns
// ---------------------------------------------------------------------

type Unit = {
  index: number;
  line: number;
  /** What this unit currently costs. */
  cur: number;
  touched: boolean;
  /** Touched by at least one non-stackable campaign → closed to all others. */
  locked: boolean;
};

type Plan = { discounts: Map<number, number>; consumed: Set<number>; total: number };

const byPriceDesc = (a: Unit, b: Unit) => b.cur - a.cur || a.index - b.index;

function planGroupOffer(
  pool: Unit[],
  buyQty: number,
  getQty: number,
  discountFor: (unit: Unit) => number,
): Plan | null {
  const size = buyQty + getQty;
  const sorted = [...pool].sort(byPriceDesc);
  const groups = Math.floor(sorted.length / size);
  const discounts = new Map<number, number>();
  const consumed = new Set<number>();
  let total = 0;
  for (let g = 0; g < groups; g++) {
    const members = sorted.slice(g * size, (g + 1) * size);
    for (const member of members) consumed.add(member.index);
    for (const free of members.slice(buyQty)) {
      const d = Math.min(discountFor(free), free.cur);
      if (d > 0) {
        discounts.set(free.index, d);
        total += d;
      }
    }
  }
  return total > 0 ? { discounts, consumed, total } : null;
}

function planBundle(pool: Unit[], qty: number, bundlePrice: number): Plan | null {
  const sorted = [...pool].sort(byPriceDesc);
  const groups = Math.floor(sorted.length / qty);
  const discounts = new Map<number, number>();
  const consumed = new Set<number>();
  let total = 0;
  for (let g = 0; g < groups; g++) {
    const members = sorted.slice(g * qty, (g + 1) * qty);
    const sum = members.reduce((a, u) => a + u.cur, 0);
    const saving = sum - bundlePrice;
    if (saving <= 0) continue;
    const shares = allocateProportionally(saving, members.map((u) => u.cur));
    members.forEach((member, i) => {
      consumed.add(member.index);
      if (shares[i]! > 0) discounts.set(member.index, shares[i]!);
    });
    total += saving;
  }
  return total > 0 ? { discounts, consumed, total } : null;
}

/** Spreads `total` (already capped) over the pool, proportional to price. */
function spreadOverPool(pool: Unit[], total: number): Plan | null {
  if (total <= 0 || pool.length === 0) return null;
  const shares = allocateProportionally(total, pool.map((u) => u.cur));
  const discounts = new Map<number, number>();
  const consumed = new Set<number>();
  let actual = 0;
  pool.forEach((unit, i) => {
    consumed.add(unit.index);
    if (shares[i]! > 0) {
      discounts.set(unit.index, shares[i]!);
      actual += shares[i]!;
    }
  });
  return actual > 0 ? { discounts, consumed, total: actual } : null;
}

function planCampaign(campaign: EngineCampaign, pool: Unit[]): Plan | null {
  if (pool.length === 0) return null;
  switch (campaign.kind) {
    case "buy_x_get_y_free":
      return planGroupOffer(pool, campaign.config.buyQty, campaign.config.getQty, (u) => u.cur);
    case "buy_x_get_y_percent": {
      const pct = campaign.config.percent;
      return planGroupOffer(pool, campaign.config.buyQty, campaign.config.getQty, (u) => percentOf(u.cur, pct));
    }
    case "bundle_price":
      return planBundle(pool, campaign.config.qty, campaign.config.priceToman);
    case "tiered_discount": {
      const metric = campaign.config.basis === "quantity" ? pool.length : pool.reduce((a, u) => a + u.cur, 0);
      const tier = [...campaign.config.tiers].reverse().find((t) => metric >= t.min);
      if (!tier) return null;
      const raw = pool.reduce((a, u) => a + percentOf(u.cur, tier.percent), 0);
      const total = campaign.config.maxDiscountToman ? Math.min(raw, campaign.config.maxDiscountToman) : raw;
      // Per-unit floors when uncapped; proportional split only when capped.
      if (total === raw) {
        const discounts = new Map<number, number>();
        pool.forEach((u) => {
          const d = percentOf(u.cur, tier.percent);
          if (d > 0) discounts.set(u.index, d);
        });
        return total > 0 ? { discounts, consumed: new Set(pool.map((u) => u.index)), total } : null;
      }
      return spreadOverPool(pool, total);
    }
    case "basket_discount": {
      const sum = pool.reduce((a, u) => a + u.cur, 0);
      if (sum < campaign.config.minSpendToman) return null;
      const raw = campaign.config.type === "percent" ? percentOf(sum, campaign.config.value) : campaign.config.value;
      const capped = campaign.config.maxDiscountToman ? Math.min(raw, campaign.config.maxDiscountToman) : raw;
      return spreadOverPool(pool, Math.min(capped, sum));
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------

export function evaluateCart(lineInputs: readonly EngineLineInput[], allCampaigns: readonly EngineCampaign[]): EngineResult {
  const campaigns = [...allCampaigns].sort(byAge);
  const lines = lineInputs.filter((line) => line.quantity > 0);

  const units: Unit[] = [];
  lines.forEach((line, lineIdx) => {
    for (let q = 0; q < line.quantity; q++) {
      units.push({ index: units.length, line: lineIdx, cur: line.unitPriceToman, touched: false, locked: false });
    }
  });
  const unitDiscount = new Array<number>(units.length).fill(0);
  const lineNames: Array<Set<string>> = lines.map(() => new Set<string>());
  const appliedTotals = new Map<string, number>();
  const campaignById = new Map(campaigns.map((c) => [c.id, c]));
  const credit = (campaignId: string, amount: number) =>
    appliedTotals.set(campaignId, (appliedTotals.get(campaignId) ?? 0) + amount);

  // Stage 1 — price-level.
  lines.forEach((line, lineIdx) => {
    const best = bestPriceCampaign(campaigns, line, line.unitPriceToman);
    if (!best) return;
    const perUnit = line.unitPriceToman - best.priceToman;
    for (const unit of units) {
      if (unit.line !== lineIdx) continue;
      unit.cur = best.priceToman;
      unit.touched = true;
      unit.locked = !best.campaign.stackable;
      unitDiscount[unit.index]! += perUnit;
    }
    credit(best.campaign.id, perUnit * line.quantity);
    lineNames[lineIdx]!.add(best.campaign.name);
  });

  // Stage 2 — cart-level, greedy by customer saving.
  const remaining = campaigns.filter((c) => !isPriceLevelKind(c.kind) && c.kind !== "free_shipping");
  while (remaining.length > 0) {
    let best: { campaign: EngineCampaign; plan: Plan } | null = null;
    for (const campaign of remaining) {
      const pool = units.filter(
        (u) =>
          campaignCoversProduct(campaign.scope, lines[u.line]!) &&
          (!u.touched || (campaign.stackable && !u.locked)),
      );
      const plan = planCampaign(campaign, pool);
      if (plan && (!best || plan.total > best.plan.total)) best = { campaign, plan };
    }
    if (!best) break;
    remaining.splice(remaining.indexOf(best.campaign), 1);
    for (const index of best.plan.consumed) {
      const unit = units[index]!;
      unit.touched = true;
      if (!best.campaign.stackable) unit.locked = true;
    }
    for (const [index, amount] of best.plan.discounts) {
      const unit = units[index]!;
      unit.cur -= amount;
      unitDiscount[index]! += amount;
      lineNames[unit.line]!.add(best.campaign.name);
    }
    credit(best.campaign.id, best.plan.total);
  }

  // Results per line.
  const lineResults: EngineLineResult[] = lines.map((line, lineIdx) => {
    const discountToman = units.reduce((a, u) => (u.line === lineIdx ? a + unitDiscount[u.index]! : a), 0);
    const grossToman = line.unitPriceToman * line.quantity;
    return {
      lineId: line.lineId,
      unitPriceToman: line.unitPriceToman,
      quantity: line.quantity,
      grossToman,
      discountToman,
      payableToman: grossToman - discountToman,
      campaignNames: [...lineNames[lineIdx]!],
    };
  });

  // Stage 3 — free shipping, judged on what eligible lines actually cost.
  const shippingCandidates = campaigns
    .filter((c): c is EngineCampaign & { kind: "free_shipping" } => c.kind === "free_shipping")
    .sort((a, b) => Number(b.config.includeExpress) - Number(a.config.includeExpress) || byAge(a, b));
  let freeShipping: FreeShippingResult | null = null;
  for (const campaign of shippingCandidates) {
    const eligible = lineResults.filter((_, i) => campaignCoversProduct(campaign.scope, lines[i]!));
    if (eligible.length === 0) continue;
    const spend = eligible.reduce((a, l) => a + l.payableToman, 0);
    if (spend >= campaign.config.minSpendToman) {
      freeShipping = { campaignId: campaign.id, name: campaign.name, includeExpress: campaign.config.includeExpress };
      break;
    }
  }

  const applied: AppliedCampaign[] = [...appliedTotals.entries()]
    .filter(([, discount]) => discount > 0)
    .map(([campaignId, discountToman]) => {
      const campaign = campaignById.get(campaignId)!;
      return { campaignId, name: campaign.name, kind: campaign.kind, discountToman };
    });

  const grossToman = lineResults.reduce((a, l) => a + l.grossToman, 0);
  const campaignDiscountToman = lineResults.reduce((a, l) => a + l.discountToman, 0);
  return {
    lines: lineResults,
    applied,
    grossToman,
    campaignDiscountToman,
    subtotalToman: grossToman - campaignDiscountToman,
    freeShipping,
  };
}
