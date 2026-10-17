import { describe, expect, it } from "vitest";
import {
  allocateProportionally,
  evaluateCart,
  type CampaignScope,
  type EngineCampaign,
  type EngineLineInput,
} from "@/domains/campaigns/engine";
import { parseCampaignConfig } from "@/domains/campaigns/config";

let seq = 0;
const ALL: CampaignScope = {
  appliesToAll: true,
  brandIds: new Set(),
  categoryIds: new Set(),
  productIds: new Set(),
  excludedBrandIds: new Set(),
  excludedCategoryIds: new Set(),
  excludedProductIds: new Set(),
};
const scope = (over: Partial<CampaignScope>): CampaignScope => ({ ...ALL, appliesToAll: false, ...over });

function campaign(def: Pick<EngineCampaign, "kind" | "config">, over: Partial<EngineCampaign> = {}): EngineCampaign {
  seq += 1;
  return {
    id: `c${String(seq).padStart(3, "0")}`,
    slug: `campaign-${seq}`,
    name: `کمپین ${seq}`,
    description: null,
    stackable: false,
    showCountdown: false,
    startsAt: null,
    endsAt: null,
    createdAt: new Date(2026, 0, seq),
    scope: ALL,
    ...def,
    ...over,
  } as EngineCampaign;
}

const line = (id: string, price: number, quantity: number, over: Partial<EngineLineInput> = {}): EngineLineInput => ({
  lineId: id,
  productId: `p-${id}`,
  brandId: "b1",
  categoryId: "cat1",
  unitPriceToman: price,
  quantity,
  ...over,
});

describe("campaign config validation", () => {
  it("rejects percentages outside 1..99 and malformed tiers", () => {
    expect(parseCampaignConfig("percent_off", { percent: 100, maxDiscountToman: null }).ok).toBe(false);
    expect(parseCampaignConfig("percent_off", { percent: 20, maxDiscountToman: null }).ok).toBe(true);
    expect(
      parseCampaignConfig("tiered_discount", { basis: "quantity", tiers: [{ min: 3, percent: 10 }, { min: 2, percent: 20 }] }).ok,
    ).toBe(false);
    expect(parseCampaignConfig("bundle_price", { qty: 1, priceToman: 100 }).ok).toBe(false);
    expect(parseCampaignConfig("percent_off", { percent: 12.5 }).ok).toBe(false);
  });
});

describe("allocateProportionally", () => {
  it("sums exactly, is capped by the weights' total, and never exceeds a weight", () => {
    expect(allocateProportionally(100, [1, 1, 1])).toEqual([1, 1, 1]); // capped at the weights' sum
    expect(allocateProportionally(10, [10, 10, 10])).toEqual([4, 3, 3]); // equal remainders → earlier index first
    expect(allocateProportionally(2, [1, 2])).toEqual([1, 1]); // largest remainder gets the spare unit
    expect(allocateProportionally(10, [3, 2])).toEqual([3, 2]);
    expect(allocateProportionally(0, [3, 2])).toEqual([0, 0]);
    const big = allocateProportionally(1_000_000_000, [2_000_000_000, 2_000_000_000]);
    expect(big.reduce((a, b) => a + b, 0)).toBe(1_000_000_000); // exact despite >2^53 intermediate products
  });
});

describe("price-level campaigns", () => {
  it("percent off floors and respects the cap", () => {
    const r = evaluateCart([line("a", 999_999, 2)], [campaign({ kind: "percent_off", config: { percent: 10, maxDiscountToman: 50_000 } })]);
    expect(r.lines[0]!.discountToman).toBe(2 * 50_000);
    expect(r.subtotalToman).toBe(2 * 999_999 - 100_000);
    const r2 = evaluateCart([line("a", 999_999, 1)], [campaign({ kind: "percent_off", config: { percent: 10, maxDiscountToman: null } })]);
    expect(r2.lines[0]!.payableToman).toBe(999_999 - 99_999);
  });

  it("amount off never goes below zero; fixed price never raises a price", () => {
    const r = evaluateCart([line("a", 30_000, 1)], [campaign({ kind: "amount_off", config: { amountToman: 50_000 } })]);
    expect(r.lines[0]!.payableToman).toBe(0);
    const r2 = evaluateCart([line("a", 100_000, 1), line("b", 400_000, 1)], [campaign({ kind: "fixed_price", config: { priceToman: 200_000 } })]);
    expect(r2.lines.map((l) => l.payableToman)).toEqual([100_000, 200_000]);
  });

  it("picks the lowest price per line; ties go to the older campaign", () => {
    const a = campaign({ kind: "percent_off", config: { percent: 10, maxDiscountToman: null } });
    const b = campaign({ kind: "percent_off", config: { percent: 30, maxDiscountToman: null } });
    const c = campaign({ kind: "amount_off", config: { amountToman: 30_000 } }); // same 30% of 100k
    const r = evaluateCart([line("a", 100_000, 1)], [a, c, b]);
    expect(r.lines[0]!.payableToman).toBe(70_000);
    expect(r.applied).toHaveLength(1);
    expect(r.applied[0]!.campaignId).toBe(b.id); // b is older than c
  });
});

describe("scope", () => {
  it("brand, category, product targets and exclusions", () => {
    const sale = campaign(
      { kind: "percent_off", config: { percent: 50, maxDiscountToman: null } },
      { scope: scope({ brandIds: new Set(["nike"]), categoryIds: new Set(["shoes"]), excludedProductIds: new Set(["p-x"]) }) },
    );
    const r = evaluateCart(
      [
        line("nike", 100, 1, { brandId: "nike" }),
        line("shoe", 100, 1, { brandId: null, categoryId: "shoes" }),
        line("other", 100, 1, { brandId: "adidas", categoryId: "hats" }),
        line("x", 100, 1, { brandId: "nike", productId: "p-x" }),
      ],
      [sale],
    );
    expect(r.lines.map((l) => l.payableToman)).toEqual([50, 50, 100, 100]);
  });
});

describe("quantity offers", () => {
  it("buy 2 get 1 free: cheapest of each group is free, leftovers are not", () => {
    const offer = campaign({ kind: "buy_x_get_y_free", config: { buyQty: 2, getQty: 1 } });
    const r = evaluateCart([line("a", 300, 1), line("b", 200, 1), line("c", 100, 1), line("d", 90, 1)], [offer]);
    expect(r.campaignDiscountToman).toBe(100);
    expect(r.subtotalToman).toBe(300 + 200 + 90);
    const r6 = evaluateCart([line("a", 100, 6)], [offer]);
    expect(r6.campaignDiscountToman).toBe(200);
  });

  it("buy 1 get 1 at 50%", () => {
    const offer = campaign({ kind: "buy_x_get_y_percent", config: { buyQty: 1, getQty: 1, percent: 50 } });
    const r = evaluateCart([line("a", 1001, 2)], [offer]);
    expect(r.campaignDiscountToman).toBe(500);
  });

  it("bundle price: 3 for 500; only groups that actually save", () => {
    const offer = campaign({ kind: "bundle_price", config: { qty: 3, priceToman: 500 } });
    expect(evaluateCart([line("a", 200, 3)], [offer]).subtotalToman).toBe(500);
    expect(evaluateCart([line("a", 100, 3)], [offer]).subtotalToman).toBe(300); // would cost more: not applied
    const mixed = evaluateCart([line("a", 300, 1), line("b", 200, 1), line("c", 100, 1), line("d", 90, 1)], [offer]);
    expect(mixed.subtotalToman).toBe(500 + 90);
  });

  it("tiered by quantity picks the highest reached tier", () => {
    const offer = campaign({
      kind: "tiered_discount",
      config: { basis: "quantity", tiers: [{ min: 2, percent: 10 }, { min: 4, percent: 20 }], maxDiscountToman: null },
    });
    expect(evaluateCart([line("a", 100, 1)], [offer]).campaignDiscountToman).toBe(0);
    expect(evaluateCart([line("a", 100, 3)], [offer]).campaignDiscountToman).toBe(30);
    expect(evaluateCart([line("a", 100, 4)], [offer]).campaignDiscountToman).toBe(80);
  });

  it("basket discount: threshold, percent, amount, cap", () => {
    const pct = campaign({ kind: "basket_discount", config: { minSpendToman: 1000, type: "percent", value: 10, maxDiscountToman: 150 } });
    expect(evaluateCart([line("a", 999, 1)], [pct]).campaignDiscountToman).toBe(0);
    expect(evaluateCart([line("a", 1000, 1)], [pct]).campaignDiscountToman).toBe(100);
    expect(evaluateCart([line("a", 1000, 3)], [pct]).campaignDiscountToman).toBe(150);
    const amt = campaign({ kind: "basket_discount", config: { minSpendToman: 0, type: "amount", value: 5000, maxDiscountToman: null } });
    expect(evaluateCart([line("a", 1000, 1)], [amt]).subtotalToman).toBe(0); // capped at the pool total
  });
});

describe("stacking and conflict resolution", () => {
  const sale = () => campaign({ kind: "percent_off", config: { percent: 20, maxDiscountToman: null } });
  const bogo = (stackable: boolean) =>
    campaign({ kind: "buy_x_get_y_free", config: { buyQty: 1, getQty: 1 } }, { stackable });

  it("non-stackable sale items are excluded from cart-level offers", () => {
    const r = evaluateCart([line("a", 100, 2)], [sale(), bogo(true)]);
    expect(r.subtotalToman).toBe(160); // only the 20% applies
  });

  it("both stackable → the offers combine on the already-reduced price", () => {
    const s = campaign({ kind: "percent_off", config: { percent: 20, maxDiscountToman: null } }, { stackable: true });
    const r = evaluateCart([line("a", 100, 2)], [s, bogo(true)]);
    expect(r.subtotalToman).toBe(80); // 2×80 then one free
  });

  it("a non-stackable cart offer blocks a stackable one on the same units", () => {
    const r = evaluateCart([line("a", 100, 2)], [bogo(false), bogo(true)]);
    expect(r.subtotalToman).toBe(100);
    expect(r.applied).toHaveLength(1);
  });

  it("greedy: of two overlapping non-stackable offers the bigger saving wins", () => {
    const small = campaign({ kind: "basket_discount", config: { minSpendToman: 0, type: "percent", value: 5, maxDiscountToman: null } });
    const big = campaign({ kind: "basket_discount", config: { minSpendToman: 0, type: "percent", value: 25, maxDiscountToman: null } });
    const r = evaluateCart([line("a", 1000, 1)], [small, big]);
    expect(r.subtotalToman).toBe(750);
    expect(r.applied.map((a) => a.campaignId)).toEqual([big.id]);
  });

  it("offers on disjoint products both apply", () => {
    const shoes = campaign({ kind: "percent_off", config: { percent: 10, maxDiscountToman: null } }, { scope: scope({ categoryIds: new Set(["shoes"]) }) });
    const hats = campaign({ kind: "amount_off", config: { amountToman: 10 } }, { scope: scope({ categoryIds: new Set(["hats"]) }) });
    const r = evaluateCart([line("s", 100, 1, { categoryId: "shoes" }), line("h", 100, 1, { categoryId: "hats" })], [shoes, hats]);
    expect(r.lines.map((l) => l.payableToman)).toEqual([90, 90]);
  });
});

describe("free shipping", () => {
  it("judged on payable amount of eligible lines", () => {
    const fs = campaign({ kind: "free_shipping", config: { minSpendToman: 1000, includeExpress: false } });
    const sale = campaign({ kind: "percent_off", config: { percent: 50, maxDiscountToman: null } });
    expect(evaluateCart([line("a", 1500, 1)], [fs]).freeShipping?.campaignId).toBe(fs.id);
    expect(evaluateCart([line("a", 1500, 1)], [fs, sale]).freeShipping).toBeNull(); // 750 after sale
    expect(evaluateCart([], [fs]).freeShipping).toBeNull();
  });

  it("scope limits which lines count toward the threshold", () => {
    const fs = campaign(
      { kind: "free_shipping", config: { minSpendToman: 1000, includeExpress: true } },
      { scope: scope({ brandIds: new Set(["nike"]) }) },
    );
    expect(evaluateCart([line("a", 2000, 1, { brandId: "adidas" })], [fs]).freeShipping).toBeNull();
    expect(evaluateCart([line("a", 2000, 1, { brandId: "nike" })], [fs]).freeShipping?.includeExpress).toBe(true);
  });
});

describe("invariants over random carts", () => {
  // Small deterministic PRNG so failures are reproducible.
  let state = 123456789;
  const rnd = (n: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % n;
  };

  it("discounts are integers, bounded, and reconcile with per-campaign totals", () => {
    const kinds: Array<() => EngineCampaign> = [
      () => campaign({ kind: "percent_off", config: { percent: 1 + rnd(60), maxDiscountToman: rnd(2) ? null : 1 + rnd(50_000) } }, { stackable: !!rnd(2) }),
      () => campaign({ kind: "amount_off", config: { amountToman: 1 + rnd(90_000) } }, { stackable: !!rnd(2) }),
      () => campaign({ kind: "fixed_price", config: { priceToman: rnd(120_000) } }, { stackable: !!rnd(2) }),
      () => campaign({ kind: "buy_x_get_y_free", config: { buyQty: 1 + rnd(3), getQty: 1 + rnd(2) } }, { stackable: !!rnd(2) }),
      () => campaign({ kind: "buy_x_get_y_percent", config: { buyQty: 1 + rnd(3), getQty: 1 + rnd(2), percent: 1 + rnd(90) } }, { stackable: !!rnd(2) }),
      () => campaign({ kind: "bundle_price", config: { qty: 2 + rnd(3), priceToman: rnd(300_000) } }, { stackable: !!rnd(2) }),
      () =>
        campaign(
          { kind: "tiered_discount", config: { basis: rnd(2) ? "quantity" : "amount", tiers: [{ min: 2, percent: 5 + rnd(10) }, { min: 300_000, percent: 40 }], maxDiscountToman: rnd(2) ? null : 20_000 } },
          { stackable: !!rnd(2) },
        ),
      () => campaign({ kind: "basket_discount", config: { minSpendToman: rnd(200_000), type: rnd(2) ? "percent" : "amount", value: 1 + rnd(40), maxDiscountToman: rnd(2) ? null : 30_000 } }, { stackable: !!rnd(2) }),
      () => campaign({ kind: "free_shipping", config: { minSpendToman: rnd(500_000), includeExpress: !!rnd(2) } }),
    ];
    for (let iteration = 0; iteration < 400; iteration++) {
      const campaigns = Array.from({ length: 1 + rnd(5) }, () => kinds[rnd(kinds.length)]!());
      const lines = Array.from({ length: 1 + rnd(4) }, (_, i) => line(`l${i}`, 1000 + rnd(400_000), 1 + rnd(5)));
      const r = evaluateCart(lines, campaigns);
      let discountSum = 0;
      for (const l of r.lines) {
        expect(Number.isInteger(l.discountToman)).toBe(true);
        expect(l.discountToman).toBeGreaterThanOrEqual(0);
        expect(l.payableToman).toBeGreaterThanOrEqual(0);
        expect(l.payableToman + l.discountToman).toBe(l.grossToman);
        discountSum += l.discountToman;
      }
      expect(discountSum).toBe(r.campaignDiscountToman);
      expect(r.applied.reduce((a, c) => a + c.discountToman, 0)).toBe(r.campaignDiscountToman);
      expect(r.subtotalToman).toBe(r.grossToman - r.campaignDiscountToman);
      // Deterministic: same input, same output (order of campaigns irrelevant).
      expect(evaluateCart(lines, [...campaigns].reverse())).toEqual(r);
    }
  });
});
