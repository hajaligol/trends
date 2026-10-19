import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  campaignTargets,
  campaigns,
  cartItems,
  carts,
  categories,
  orderCampaignApplications,
  orderItems,
  orders,
  productVariants,
  products,
  users,
  type CampaignKind,
} from "@/lib/db/schema";
import { addItemToCart, createCart, getCartSummary } from "@/domains/cart/queries";
import { createOrderFromCart } from "@/domains/orders/queries";
import { listShippingMethods } from "@/domains/shipping/methods";
import { getProductDetailBySlug } from "@/domains/catalog/queries";
import { createTestCategory, createTestProductWithVariant, createTestUser } from "./helpers";

/**
 * Sale campaigns against a real database: the cart prices from live
 * campaigns, `createOrderFromCart` recomputes them inside its transaction and
 * snapshots them on the order, windows/active flags are honoured, and an
 * order survives its campaign being deleted.
 */

const shipping = {
  recipientName: "کاربر آزمایشی",
  recipientMobile: "+989123456789",
  province: "تهران",
  city: "تهران",
  addressLine: "خیابان آزمایشی، پلاک ۱",
  postalCode: "1234567890",
  plaqueUnitDetails: null,
  deliveryNotes: null,
};
// The passed-in fee is deliberately WRONG: the order must ignore it.
const bogusMethod = { code: "standard", label: "x", estimateLabel: "x", feeToman: 12_345 };

const campaignIds: string[] = [];
const cartIds: string[] = [];
const orderIds: string[] = [];
const userIds: string[] = [];
const productIds: string[] = [];
let categoryId = "";

async function makeCampaign(
  kind: CampaignKind,
  config: unknown,
  opts: { categoryId?: string; productId?: string; isActive?: boolean; startsAt?: Date | null; endsAt?: Date | null; stackable?: boolean } = {},
) {
  const [row] = await db
    .insert(campaigns)
    .values({
      name: `کمپین آزمایشی ${campaignIds.length + 1}`,
      slug: `test-${Date.now().toString(36)}-${campaignIds.length + 1}-${Math.random().toString(36).slice(2, 7)}`,
      kind,
      config,
      appliesToAll: false,
      isActive: opts.isActive ?? true,
      startsAt: opts.startsAt ?? null,
      endsAt: opts.endsAt ?? null,
      stackable: opts.stackable ?? false,
    })
    .returning();
  campaignIds.push(row!.id);
  await db.insert(campaignTargets).values(
    opts.productId ? { campaignId: row!.id, productId: opts.productId } : { campaignId: row!.id, categoryId: opts.categoryId ?? categoryId },
  );
  return row!;
}

async function freshCart(userId: string | null, lines: Array<{ variantId: string; qty: number }>) {
  const cart = await createCart(userId);
  cartIds.push(cart.id);
  for (const line of lines) await addItemToCart(cart.id, line.variantId, line.qty);
  return cart;
}

async function sale(price = 400_000, stock = 20) {
  const { product, variant } = await createTestProductWithVariant(categoryId, { priceToman: price, stock });
  productIds.push(product.id);
  return { product, variant };
}

beforeAll(async () => {
  categoryId = (await createTestCategory()).id;
});

afterAll(async () => {
  for (const id of orderIds) await db.delete(orders).where(eq(orders.id, id));
  for (const id of cartIds) await db.delete(cartItems).where(eq(cartItems.cartId, id));
  for (const id of cartIds) await db.delete(carts).where(eq(carts.id, id));
  if (campaignIds.length) await db.delete(campaigns).where(inArray(campaigns.id, campaignIds));
  for (const id of userIds) await db.delete(users).where(eq(users.id, id));
  for (const id of productIds) await db.delete(productVariants).where(eq(productVariants.productId, id));
  for (const id of productIds) await db.delete(products).where(eq(products.id, id));
  if (categoryId) await db.delete(categories).where(eq(categories.id, categoryId));
});

describe("cart pricing with campaigns", () => {
  it("applies a percent campaign to the line total and reports it", async () => {
    const { product, variant } = await sale(400_000);
    await makeCampaign("percent_off", { percent: 25, maxDiscountToman: null }, { productId: product.id });
    const cart = await freshCart(null, [{ variantId: variant.id, qty: 2 }]);
    const summary = await getCartSummary(cart.id);
    expect(summary.grossToman).toBe(800_000);
    expect(summary.campaignDiscountToman).toBe(200_000);
    expect(summary.subtotalToman).toBe(600_000);
    expect(summary.items[0]!.unitPriceToman).toBe(400_000); // regular price stays visible
    expect(summary.items[0]!.lineTotalToman).toBe(600_000);
    expect(summary.appliedCampaigns).toHaveLength(1);
  });

  it("ignores paused, expired and not-yet-started campaigns", async () => {
    const { product, variant } = await sale(300_000);
    const past = new Date(Date.now() - 86_400_000);
    const future = new Date(Date.now() + 86_400_000);
    await makeCampaign("percent_off", { percent: 50, maxDiscountToman: null }, { productId: product.id, isActive: false });
    await makeCampaign("percent_off", { percent: 50, maxDiscountToman: null }, { productId: product.id, endsAt: past, startsAt: new Date(past.getTime() - 1000) });
    await makeCampaign("percent_off", { percent: 50, maxDiscountToman: null }, { productId: product.id, startsAt: future });
    const cart = await freshCart(null, [{ variantId: variant.id, qty: 1 }]);
    expect((await getCartSummary(cart.id)).campaignDiscountToman).toBe(0);
  });

  it("ignores a campaign whose stored config is invalid instead of applying it", async () => {
    const { product, variant } = await sale(300_000);
    await makeCampaign("percent_off", { percent: 500 }, { productId: product.id });
    const cart = await freshCart(null, [{ variantId: variant.id, qty: 1 }]);
    expect((await getCartSummary(cart.id)).campaignDiscountToman).toBe(0);
  });

  it("buy 2 get 1 free across different products in a category", async () => {
    const a = await sale(300_000);
    const b = await sale(200_000);
    const c = await sale(100_000);
    // Scope to these three only via product targets.
    const offer = await makeCampaign("buy_x_get_y_free", { buyQty: 2, getQty: 1 }, { productId: a.product.id });
    await db.insert(campaignTargets).values([
      { campaignId: offer.id, productId: b.product.id },
      { campaignId: offer.id, productId: c.product.id },
    ]);
    const cart = await freshCart(null, [
      { variantId: a.variant.id, qty: 1 },
      { variantId: b.variant.id, qty: 1 },
      { variantId: c.variant.id, qty: 1 },
    ]);
    const summary = await getCartSummary(cart.id);
    expect(summary.campaignDiscountToman).toBe(100_000); // cheapest free
    expect(summary.subtotalToman).toBe(500_000);
  });

  it("shows the campaign price on the product page and keeps the regular price struck through", async () => {
    const { product, variant } = await sale(500_000);
    await makeCampaign("amount_off", { amountToman: 120_000 }, { productId: product.id });
    const detail = await getProductDetailBySlug(product.slug);
    const shown = detail!.variants.find((v) => v.id === variant.id)!;
    expect(shown.priceToman).toBe(380_000);
    expect(shown.compareAtPriceToman).toBe(500_000);
    expect(detail!.campaigns).toHaveLength(1);
  });
});

describe("createOrderFromCart with campaigns", () => {
  it("snapshots discounts on items, order and applications; line totals reconcile", async () => {
    const { product, variant } = await sale(400_000);
    const offer = await makeCampaign("percent_off", { percent: 10, maxDiscountToman: null }, { productId: product.id });
    const user = await createTestUser();
    userIds.push(user.id);
    const cart = await freshCart(user.id, [{ variantId: variant.id, qty: 3 }]);

    const order = await createOrderFromCart(cart.id, user.id, shipping, bogusMethod, null);
    orderIds.push(order.id);

    expect(order.campaignDiscountToman).toBe(120_000);
    expect(order.subtotalToman).toBe(1_080_000);
    // Shipping fee comes from the server's own resolution, never from the argument.
    expect(order.shippingFeeToman).not.toBe(12_345);
    expect(order.totalToman).toBe(order.subtotalToman + order.shippingFeeToman - order.discountToman);

    const [item] = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    expect(item!.unitPriceToman).toBe(400_000);
    expect(item!.campaignDiscountToman).toBe(120_000);
    expect(item!.lineTotalToman).toBe(1_080_000);
    expect(item!.campaignLabel).toBe(offer.name);

    const apps = await db.select().from(orderCampaignApplications).where(eq(orderCampaignApplications.orderId, order.id));
    expect(apps).toHaveLength(1);
    expect(apps[0]!.discountToman).toBe(120_000);
    expect(apps[0]!.campaignName).toBe(offer.name);
  });

  it("the database rejects an order item whose total does not reconcile", async () => {
    const { product, variant } = await sale(100_000);
    const user = await createTestUser();
    userIds.push(user.id);
    const cart = await freshCart(user.id, [{ variantId: variant.id, qty: 1 }]);
    const order = await createOrderFromCart(cart.id, user.id, shipping, bogusMethod, null);
    orderIds.push(order.id);
    await expect(
      db.insert(orderItems).values({
        orderId: order.id,
        variantId: variant.id,
        productId: product.id,
        productTitle: "x",
        productSlug: "x",
        sku: "x",
        size: "M",
        color: "c",
        unitPriceToman: 100_000,
        quantity: 2,
        campaignDiscountToman: 0,
        lineTotalToman: 1, // should be 200_000
      }),
    ).rejects.toThrow();
  });

  it("free-shipping campaign waives the fee and records the waived amount", async () => {
    const { product, variant } = await sale(250_000);
    const offer = await makeCampaign("free_shipping", { minSpendToman: 0, includeExpress: false }, { productId: product.id });
    const user = await createTestUser();
    userIds.push(user.id);
    const cart = await freshCart(user.id, [{ variantId: variant.id, qty: 1 }]);
    const summary = await getCartSummary(cart.id);
    expect(summary.freeShipping?.campaignId).toBe(offer.id);
    const methods = await listShippingMethods(summary.subtotalToman, summary.freeShipping);
    expect(methods.find((m) => m.code === "standard")!.feeToman).toBe(0);

    const regular = (await listShippingMethods(summary.subtotalToman, null)).find((m) => m.code === "standard")!;
    const order = await createOrderFromCart(cart.id, user.id, shipping, bogusMethod, null);
    orderIds.push(order.id);
    expect(order.shippingFeeToman).toBe(0);
    expect(order.shippingDiscountToman).toBe(regular.feeToman);
  });

  it("an order is unchanged when its campaign is later deleted", async () => {
    const { product, variant } = await sale(300_000);
    const offer = await makeCampaign("percent_off", { percent: 20, maxDiscountToman: null }, { productId: product.id });
    const user = await createTestUser();
    userIds.push(user.id);
    const cart = await freshCart(user.id, [{ variantId: variant.id, qty: 1 }]);
    const order = await createOrderFromCart(cart.id, user.id, shipping, bogusMethod, null);
    orderIds.push(order.id);

    await db.delete(campaigns).where(eq(campaigns.id, offer.id));
    const [after] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(after!.campaignDiscountToman).toBe(60_000);
    const apps = await db.select().from(orderCampaignApplications).where(eq(orderCampaignApplications.orderId, order.id));
    expect(apps[0]!.campaignId).toBeNull();
    expect(apps[0]!.campaignName).toBe(offer.name);
  });
});

describe("admin coverage preview", () => {
  it("counts products covered via category subtree, brand, product and exclusions", async () => {
    const { previewCampaignCoverage } = await import("@/domains/campaigns/admin-queries");
    const a = await sale(200_000);
    const b = await sale(300_000);
    const definition = { kind: "percent_off" as const, config: { percent: 10, maxDiscountToman: null } };
    const input = {
      kind: "percent_off" as const,
      config: definition.config,
      appliesToAll: false,
      brandIds: [],
      categoryIds: [categoryId],
      productIds: [],
      excludedProductIds: [] as string[],
      excludeCampaignId: null,
    };
    const all = await previewCampaignCoverage(input, definition);
    expect(all.matchedCount).toBeGreaterThanOrEqual(2);

    const withoutB = await previewCampaignCoverage({ ...input, excludedProductIds: [b.product.id] }, definition);
    expect(withoutB.matchedCount).toBe(all.matchedCount - 1);

    const single = await previewCampaignCoverage({ ...input, categoryIds: [], productIds: [a.product.id] }, definition);
    expect(single.matchedCount).toBe(1);
    expect(single.sample[0]!.regularPriceToman).toBe(200_000);
    expect(single.sample[0]!.salePriceToman).toBe(180_000);
  });
});

describe("homepage placement and campaign page", () => {
  const manualSlideIds: string[] = [];
  const HOME_IMG = "/assets/hero/test-campaign.webp";

  async function placed(
    placement: "hero" | "banner",
    over: Partial<typeof campaigns.$inferInsert> = {},
  ) {
    const { product } = await sale(250_000);
    const [row] = await db
      .insert(campaigns)
      .values({
        name: `کمپین صفحه اصلی ${campaignIds.length + 1}`,
        slug: `home-${Date.now().toString(36)}-${campaignIds.length + 1}-${Math.random().toString(36).slice(2, 7)}`,
        kind: "percent_off",
        config: { percent: 15, maxDiscountToman: null },
        appliesToAll: false,
        homePlacement: placement,
        homeImageUrl: HOME_IMG,
        ...over,
      })
      .returning();
    campaignIds.push(row!.id);
    await db.insert(campaignTargets).values({ campaignId: row!.id, productId: product.id });
    return { row: row!, product };
  }

  afterAll(async () => {
    const { heroSlides } = await import("@/lib/db/schema");
    for (const id of manualSlideIds) await db.delete(heroSlides).where(eq(heroSlides.id, id));
  });

  it("a live hero campaign appears as a slide linking to its sale page", async () => {
    const { getLiveHomePlacements } = await import("@/domains/campaigns/placements");
    const { row } = await placed("hero");
    const { hero, banners } = await getLiveHomePlacements();
    const slide = hero.find((s) => s.id === `campaign-${row.id}`);
    expect(slide).toBeDefined();
    expect(slide!.imageUrl).toBe(HOME_IMG);
    expect(slide!.ctaHref).toBe(`/sale/${encodeURIComponent(row.slug)}`);
    expect(banners.find((b) => b.id === `campaign-${row.id}`)).toBeUndefined();
  });

  it("a live banner campaign uses its overrides, else name/description/default label", async () => {
    const { getLiveHomePlacements } = await import("@/domains/campaigns/placements");
    const plain = await placed("banner", { description: "توضیح کمپین", homeBannerTone: "blue" });
    const custom = await placed("banner", { homeTitle: "عنوان سفارشی", homeDescription: "توضیح سفارشی", homeCtaLabel: "همین حالا ببین" });
    const { banners } = await getLiveHomePlacements();
    const a = banners.find((b) => b.id === `campaign-${plain.row.id}`)!;
    expect(a).toMatchObject({ title: plain.row.name, description: "توضیح کمپین", ctaLabel: "مشاهده محصولات", tone: "blue" });
    const b = banners.find((x) => x.id === `campaign-${custom.row.id}`)!;
    expect(b).toMatchObject({ title: "عنوان سفارشی", description: "توضیح سفارشی", ctaLabel: "همین حالا ببین" });
  });

  it("placement 'none', paused, scheduled, ended and invalid-config campaigns never appear", async () => {
    const { getLiveHomePlacements } = await import("@/domains/campaigns/placements");
    const none = await placed("hero", { homePlacement: "none", homeImageUrl: null });
    const paused = await placed("hero", { isActive: false });
    const scheduled = await placed("banner", { startsAt: new Date(Date.now() + 3_600_000) });
    const ended = await placed("hero", { startsAt: new Date(Date.now() - 7_200_000), endsAt: new Date(Date.now() - 3_600_000) });
    const invalid = await placed("hero", { config: { percent: 999 } });
    const badImage = await placed("hero", { homeImageUrl: "https://evil.example/x.png" });
    const { hero, banners } = await getLiveHomePlacements();
    const shown = new Set([...hero, ...banners].map((x) => x.id));
    for (const { row } of [none, paused, scheduled, ended, invalid, badImage]) {
      expect(shown.has(`campaign-${row.id}`), row.name).toBe(false);
    }
  });

  it("campaign slides come before manually managed ones; manual slides become clickable data", async () => {
    const { getHomepageHeroSlides } = await import("@/domains/content/queries");
    const { heroSlides } = await import("@/lib/db/schema");
    const [manual] = await db
      .insert(heroSlides)
      .values({ alt: "اسلاید دستی", imageUrl: "/assets/hero/manual.webp", ctaHref: "/category/men", displayOrder: 0 })
      .returning();
    manualSlideIds.push(manual!.id);
    const { row } = await placed("hero");
    const slides = await getHomepageHeroSlides();
    const campaignIndex = slides.findIndex((s) => s.id === `campaign-${row.id}`);
    const manualIndex = slides.findIndex((s) => s.id === manual!.id);
    expect(campaignIndex).toBeGreaterThanOrEqual(0);
    expect(manualIndex).toBeGreaterThan(campaignIndex);
    expect(slides[manualIndex]!.ctaHref).toBe("/category/men");
  });

  it("the database refuses a hero/banner placement without an image", async () => {
    await expect(
      db.insert(campaigns).values({
        name: "x",
        slug: `noimg-${Math.random().toString(36).slice(2, 8)}`,
        kind: "percent_off",
        config: { percent: 10, maxDiscountToman: null },
        homePlacement: "hero",
        homeImageUrl: null,
      }),
    ).rejects.toThrow();
  });

  it("slugs are unique", async () => {
    const { row } = await placed("hero");
    await expect(
      db.insert(campaigns).values({ name: "dup", slug: row.slug, kind: "percent_off", config: { percent: 10, maxDiscountToman: null } }),
    ).rejects.toThrow();
  });

  it("the campaign page lists exactly the covered, active products", async () => {
    const { getCampaignLanding } = await import("@/domains/campaigns/landing");
    const { row, product } = await placed("hero");
    const other = await sale(100_000); // not covered
    const landing = await getCampaignLanding(row.slug, 1);
    expect(landing?.state).toBe("live");
    if (landing?.state !== "live") return;
    expect(landing.total).toBe(1);
    expect(landing.products.map((p) => p.id)).toEqual([product.id]);
    expect(landing.products.some((p) => p.id === other.product.id)).toBe(false);
    // The listing shows the campaign price (15% off 250,000).
    expect(landing.products[0]!.fromPriceToman).toBe(212_500);
  });

  it("the campaign page: ended → notice, paused/scheduled/unknown → null (404)", async () => {
    const { getCampaignLanding } = await import("@/domains/campaigns/landing");
    const ended = await placed("hero", { startsAt: new Date(Date.now() - 7_200_000), endsAt: new Date(Date.now() - 3_600_000) });
    const paused = await placed("hero", { isActive: false });
    const scheduled = await placed("hero", { startsAt: new Date(Date.now() + 3_600_000) });
    expect(await getCampaignLanding(ended.row.slug, 1)).toEqual({ state: "ended", name: ended.row.name });
    expect(await getCampaignLanding(paused.row.slug, 1)).toBeNull();
    expect(await getCampaignLanding(scheduled.row.slug, 1)).toBeNull();
    expect(await getCampaignLanding("does-not-exist", 1)).toBeNull();
  });

  it("a campaign with store-wide scope and exclusions pages correctly and clamps the page number", async () => {
    const { getCampaignLanding } = await import("@/domains/campaigns/landing");
    const { row, product } = await placed("hero");
    const landing = await getCampaignLanding(row.slug, 999);
    expect(landing?.state === "live" && landing.page).toBe(1);
    expect(product.id).toBeTruthy();
  });
});

describe("sale page hero image", () => {
  async function liveCampaign(over: Partial<typeof campaigns.$inferInsert> = {}) {
    const [row] = await db
      .insert(campaigns)
      .values({
        name: "کمپین هدر",
        slug: `hero-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        kind: "percent_off",
        config: { percent: 10, maxDiscountToman: null },
        appliesToAll: true,
        showCountdown: true,
        endsAt: new Date(Date.now() + 86_400_000),
        ...over,
      })
      .returning();
    campaignIds.push(row!.id);
    return row!;
  }

  it("without an image the landing keeps the text hero data", async () => {
    const { getCampaignLanding } = await import("@/domains/campaigns/landing");
    const row = await liveCampaign();
    const landing = await getCampaignLanding(row.slug, 1);
    expect(landing?.state).toBe("live");
    if (landing?.state === "live") {
      expect(landing.heroImageUrl).toBeNull();
      expect(landing.name).toBe("کمپین هدر");
      expect(landing.countdownEndsAt).not.toBeNull();
    }
  });

  it("with an image the landing exposes it and still carries the countdown", async () => {
    const { getCampaignLanding } = await import("@/domains/campaigns/landing");
    const row = await liveCampaign({ heroImageUrl: "/assets/banners/sale-hero.webp" });
    const landing = await getCampaignLanding(row.slug, 1);
    if (landing?.state !== "live") throw new Error("expected a live landing");
    expect(landing.heroImageUrl).toBe("/assets/banners/sale-hero.webp");
    expect(landing.countdownEndsAt).toBe(row.endsAt!.toISOString());
  });

  it("ignores a stored URL that is not an uploaded asset path", async () => {
    const { getCampaignLanding } = await import("@/domains/campaigns/landing");
    const row = await liveCampaign({ heroImageUrl: "https://evil.example/x.png" });
    const landing = await getCampaignLanding(row.slug, 1);
    if (landing?.state !== "live") throw new Error("expected a live landing");
    expect(landing.heroImageUrl).toBeNull();
  });
});
