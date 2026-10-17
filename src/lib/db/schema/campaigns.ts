import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { brands } from "./brands";
import { categories } from "./categories";
import { orders } from "./orders";
import { promoBannerToneEnum } from "./promo-banners";
import { products } from "./products";

/**
 * Sale campaigns («کمپین فروش»): time-boxed offers an operator creates in
 * the admin and that apply automatically — unlike a coupon, the customer
 * never types anything.
 *
 * - `kind` + `config` describe the offer. `config` is `jsonb` validated by
 *   Zod (`domains/campaigns/config.ts`) on **write and on read**; a row
 *   whose config no longer parses is ignored (and logged), never applied.
 *   All money inside it is integer Toman.
 * - Scope is explicit: `applies_to_all` = whole store, otherwise the offer
 *   covers the union of its non-exclusion `campaign_targets` (brands,
 *   categories incl. their sub-categories, single products) minus its
 *   exclusion targets. A campaign that is neither "all" nor has at least one
 *   include target is rejected by the admin action, so a forgotten selection
 *   can never discount the whole store.
 * - `starts_at`/`ends_at` are both optional (null = no bound); `is_active`
 *   is the manual kill switch.
 * - `stackable` — see `domains/campaigns/engine.ts`: a unit already
 *   discounted by one campaign can only receive a second one if BOTH opted in.
 */
export const campaignKindEnum = pgEnum("campaign_kind", [
  "percent_off",
  "amount_off",
  "fixed_price",
  "buy_x_get_y_free",
  "buy_x_get_y_percent",
  "bundle_price",
  "tiered_discount",
  "basket_discount",
  "free_shipping",
]);

/**
 * Where a campaign advertises itself on the homepage: nowhere, as a slide in
 * the hero carousel, or as a promo-banner card. Either way it links to the
 * campaign's own products page (`/sale/<slug>`) and is shown only while the
 * campaign is live.
 */
export const campaignHomePlacementEnum = pgEnum("campaign_home_placement", ["none", "hero", "banner"]);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Customer-facing name, e.g. «حراج پاییزه». */
    name: text("name").notNull(),
    /** Stable public path segment of the campaign's products page, `/sale/<slug>`. */
    slug: text("slug").notNull(),
    /** Optional customer-facing sentence shown on the product page. */
    description: text("description"),
    kind: campaignKindEnum("kind").notNull(),
    config: jsonb("config").notNull(),
    appliesToAll: boolean("applies_to_all").notNull().default(false),
    stackable: boolean("stackable").notNull().default(false),
    showCountdown: boolean("show_countdown").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    /** Homepage advertising. Image is required for `hero`/`banner` (DB-checked);
     * the text fields are optional overrides of name/description/«مشاهده محصولات». */
    homePlacement: campaignHomePlacementEnum("home_placement").notNull().default("none"),
    homeImageUrl: text("home_image_url"),
    homeBannerTone: promoBannerToneEnum("home_banner_tone").notNull().default("pink"),
    homeTitle: text("home_title"),
    homeDescription: text("home_description"),
    homeCtaLabel: text("home_cta_label"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("campaigns_slug_unique_idx").on(table.slug),
    index("campaigns_home_placement_idx").on(table.homePlacement),
    check("campaigns_home_image_required", sql`${table.homePlacement} = 'none' OR ${table.homeImageUrl} IS NOT NULL`),
    index("campaigns_is_active_window_idx").on(table.isActive, table.startsAt, table.endsAt),
    check(
      "campaigns_window_valid",
      sql`${table.startsAt} IS NULL OR ${table.endsAt} IS NULL OR ${table.startsAt} < ${table.endsAt}`,
    ),
  ],
);

/**
 * One brand / category / product a campaign includes or excludes. Three real
 * nullable foreign keys (exactly one set) instead of a polymorphic uuid, so
 * the database guarantees every target exists and removes it when the
 * target is deleted.
 */
export const campaignTargets = pgTable(
  "campaign_targets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    isExclusion: boolean("is_exclusion").notNull().default(false),
  },
  (table) => [
    index("campaign_targets_campaign_id_idx").on(table.campaignId),
    index("campaign_targets_product_id_idx").on(table.productId),
    uniqueIndex("campaign_targets_unique_idx").on(
      table.campaignId,
      sql`coalesce(${table.brandId}, ${table.categoryId}, ${table.productId})`,
      table.isExclusion,
    ),
    check(
      "campaign_targets_exactly_one_target",
      sql`num_nonnulls(${table.brandId}, ${table.categoryId}, ${table.productId}) = 1`,
    ),
  ],
);

/**
 * Immutable per-order record of which campaigns discounted it and by how
 * much (item discounts and waived shipping). `campaign_name`/`kind` are
 * snapshots: the campaign row can later be edited or deleted
 * (`ON DELETE SET NULL`) without changing what the order says.
 */
export const orderCampaignApplications = pgTable(
  "order_campaign_applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    campaignName: text("campaign_name").notNull(),
    kind: text("kind").notNull(),
    discountToman: integer("discount_toman").notNull().default(0),
    shippingDiscountToman: integer("shipping_discount_toman").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("order_campaign_applications_order_id_idx").on(table.orderId),
    index("order_campaign_applications_campaign_id_idx").on(table.campaignId),
    check("order_campaign_applications_non_negative", sql`${table.discountToman} >= 0 AND ${table.shippingDiscountToman} >= 0`),
  ],
);

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  targets: many(campaignTargets),
}));

export const campaignTargetsRelations = relations(campaignTargets, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignTargets.campaignId], references: [campaigns.id] }),
}));

export type CampaignRow = typeof campaigns.$inferSelect;
export type NewCampaignRow = typeof campaigns.$inferInsert;
export type CampaignTargetRow = typeof campaignTargets.$inferSelect;
export type CampaignKind = (typeof campaignKindEnum.enumValues)[number];
