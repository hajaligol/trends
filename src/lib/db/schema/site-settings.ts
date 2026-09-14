import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Single-row store configuration table, per TRENDS_PROJECT_CONTEXT.md §7
 * ("shipping settings", "basic site settings") and §12
 * (`site_settings`). A real singleton: `id` is always the fixed literal
 * `SINGLETON_SETTINGS_ID` (see `src/domains/admin/settings.ts`), enforced
 * as the primary key so there can only ever be exactly one row —
 * simpler than a key/value table for the small, fixed set of fields this
 * phase actually needs (rule F.5 "prefer maintainability over
 * cleverness").
 *
 * This promotes `src/domains/shipping/methods.ts`'s previously-hardcoded
 * `FREE_SHIPPING_THRESHOLD_TOMAN`/method fees to admin-editable config —
 * that module's header comment already documented this exact migration
 * path ("If a future phase needs admin-editable shipping methods,
 * promoting this to a table is a contained migration").
 *
 * Payment provider configuration is deliberately NOT stored here:
 * `PAYMENT_PROVIDER`/`PAYMENT_MERCHANT_ID` remain environment variables
 * per CLAUDE_BUILD_INSTRUCTIONS.txt rule A.17/G ("never expose secrets to
 * the browser", "do not fabricate live payment credentials") — the admin
 * settings page only *displays* which provider is currently configured
 * (read from `process.env` server-side), it never lets an admin type a
 * gateway secret into a database row.
 */
export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey(),
  storeName: text("store_name").notNull().default("ترندز"),
  supportEmail: text("support_email"),
  supportPhone: text("support_phone"),
  standardShippingFeeToman: integer("standard_shipping_fee_toman").notNull().default(90_000),
  expressShippingFeeToman: integer("express_shipping_fee_toman").notNull().default(180_000),
  freeShippingThresholdToman: integer("free_shipping_threshold_toman").notNull().default(2_000_000),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
});

export type SiteSettings = typeof siteSettings.$inferSelect;
export type NewSiteSettings = typeof siteSettings.$inferInsert;
