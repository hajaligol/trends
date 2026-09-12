import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * A saved Iranian shipping address in a customer's address book.
 * Fields follow TRENDS_PROJECT_CONTEXT.md §5 "Address" exactly (recipient
 * name, mobile, province, city, address, postal code, optional
 * plaque/unit/details, delivery notes) rather than a foreign
 * street/state/zip model.
 *
 * This table is the customer's *current* address book (Phase 6 "account
 * profile / addresses"). It is deliberately not what an order snapshots
 * at purchase time — TRENDS_PROJECT_CONTEXT.md §5 "Shipping" requires the
 * order to keep the address used at purchase time even if this row is
 * later edited/deleted, so Phase 8's `orders` table will copy the
 * relevant fields into its own shipping-snapshot columns rather than
 * holding a foreign key to a row here.
 *
 * `recipientMobile` is stored as free text rather than reusing the
 * `phone.ts` normalizer's strict validation — a recipient (e.g. a family
 * member accepting a package) is still expected to be a real Iranian
 * mobile number and the address form applies the same
 * `normalizeIranianMobile` validation, but the *column* doesn't need a
 * uniqueness constraint the way `users.mobile` does, since many addresses
 * can share one recipient number.
 */
export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientName: text("recipient_name").notNull(),
    recipientMobile: text("recipient_mobile").notNull(),
    province: text("province").notNull(),
    city: text("city").notNull(),
    addressLine: text("address_line").notNull(),
    postalCode: text("postal_code").notNull(),
    plaqueUnitDetails: text("plaque_unit_details"),
    deliveryNotes: text("delivery_notes"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("addresses_user_id_idx").on(table.userId)],
);

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
