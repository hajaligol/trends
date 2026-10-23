import { describe, expect, it } from "vitest";
import { campaignInputSchema } from "@/domains/campaigns/admin-schema";
import { dateToTehranInput, tehranInputToDate } from "@/lib/utils/tehran-time";
import { campaignStatus } from "@/domains/campaigns/status";

const UUID = "3f2b8f0e-5c1a-4d7e-9a3b-1c2d3e4f5a6b";
const base = {
  name: "حراج پاییزه",
  description: null,
  kind: "percent_off",
  config: { percent: 20, maxDiscountToman: null },
  appliesToAll: false,
  brandIds: [UUID],
  categoryIds: [],
  productIds: [],
  excludedProductIds: [],
  stackable: false,
  showCountdown: false,
  isActive: true,
  startsAt: null,
  endsAt: null,
};

describe("campaign admin input", () => {
  it("accepts a valid campaign", () => {
    expect(campaignInputSchema.safeParse(base).success).toBe(true);
  });

  it("refuses a campaign that is neither store-wide nor has any target (no accidental store-wide sale)", () => {
    expect(campaignInputSchema.safeParse({ ...base, brandIds: [] }).success).toBe(false);
  });

  it("accepts store-wide with no targets", () => {
    expect(campaignInputSchema.safeParse({ ...base, appliesToAll: true, brandIds: [] }).success).toBe(true);
  });

  it("validates the config for the chosen kind", () => {
    expect(campaignInputSchema.safeParse({ ...base, config: { percent: 0 } }).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...base, kind: "bundle_price", config: { qty: 3 } }).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...base, kind: "bogus" }).success).toBe(false);
  });

  it("requires an end time for the countdown and an end after the start", () => {
    expect(campaignInputSchema.safeParse({ ...base, showCountdown: true }).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...base, startsAt: "2026-10-20T10:00", endsAt: "2026-10-19T10:00" }).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...base, showCountdown: true, endsAt: "2026-10-20T10:00" }).success).toBe(true);
  });

  it("accepts an optional uploaded hero image and rejects anything else", () => {
    expect(campaignInputSchema.safeParse(base).success).toBe(true); // omitted ⇒ text hero
    const ok = campaignInputSchema.safeParse({ ...base, heroImageUrl: "/assets/banners/sale-hero.webp" });
    expect(ok.success && ok.data.heroImageUrl).toBe("/assets/banners/sale-hero.webp");
    const empty = campaignInputSchema.safeParse({ ...base, heroImageUrl: "  " });
    expect(empty.success && empty.data.heroImageUrl).toBeNull();
    expect(campaignInputSchema.safeParse({ ...base, heroImageUrl: "https://evil.example/x.png" }).success).toBe(false);
  });

  it("rejects non-uuid ids and over-long names", () => {
    expect(campaignInputSchema.safeParse({ ...base, brandIds: ["nope"] }).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...base, name: "ا".repeat(61) }).success).toBe(false);
  });
});

describe("Tehran time", () => {
  it("reads wall-clock input as UTC+03:30 and round-trips", () => {
    const date = tehranInputToDate("2026-10-16T00:00")!;
    expect(date.toISOString()).toBe("2026-10-15T20:30:00.000Z");
    expect(dateToTehranInput(date)).toBe("2026-10-16T00:00");
    expect(tehranInputToDate("garbage")).toBeNull();
    expect(dateToTehranInput(null)).toBe("");
  });
});

describe("campaign status", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  it("derives live / scheduled / ended / paused", () => {
    expect(campaignStatus({ isActive: true, startsAt: null, endsAt: null }, now)).toBe("live");
    expect(campaignStatus({ isActive: true, startsAt: new Date("2026-10-18T00:00:00Z"), endsAt: null }, now)).toBe("scheduled");
    expect(campaignStatus({ isActive: true, startsAt: null, endsAt: new Date("2026-10-17T11:00:00Z") }, now)).toBe("ended");
    expect(campaignStatus({ isActive: false, startsAt: null, endsAt: null }, now)).toBe("paused");
  });
});

describe("homepage placement input", () => {
  const withHome = { ...base, homePlacement: "none", homeImageUrl: null, homeBannerTone: "pink", homeTitle: null, homeDescription: null, homeCtaLabel: null };

  it("none needs no image", () => {
    expect(campaignInputSchema.safeParse(withHome).success).toBe(true);
  });

  it("hero and banner require an uploaded image", () => {
    expect(campaignInputSchema.safeParse({ ...withHome, homePlacement: "hero" }).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...withHome, homePlacement: "banner" }).success).toBe(false);
    const hero = { ...withHome, homePlacement: "hero", homeImageUrl: "/assets/hero/sale-1.webp" };
    // A hero slide also needs its phone image (hosted upload); a banner does not.
    expect(campaignInputSchema.safeParse(hero).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...hero, homeMobileImageUrl: "https://evil.example/m.png" }).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...hero, homeMobileImageUrl: "/assets/hero/sale-1-m.webp" }).success).toBe(true);
    expect(campaignInputSchema.safeParse({ ...withHome, homePlacement: "banner", homeImageUrl: "/assets/banners/sale-1.webp", homeTitle: "عنوان" }).success).toBe(true);
  });

  it("rejects images that would break next/image (external, traversal, wrong folder)", () => {
    for (const bad of ["https://evil.example/x.png", "//evil.example/x.png", "/assets/hero/../../etc/passwd", "/assets/other/x.png", "/x.png", "javascript:alert(1)"]) {
      expect(campaignInputSchema.safeParse({ ...withHome, homePlacement: "hero", homeImageUrl: bad, homeMobileImageUrl: "/assets/hero/m.webp" }).success, bad).toBe(false);
    }
  });

  it("rejects an unknown placement", () => {
    expect(campaignInputSchema.safeParse({ ...withHome, homePlacement: "popup" }).success).toBe(false);
  });
});
