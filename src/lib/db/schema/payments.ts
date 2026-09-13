import { relations, sql } from "drizzle-orm";
import { check, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { paymentEvents } from "./payment-events";

/**
 * One payment attempt for an order. An order can have more than one row
 * here (e.g. a failed attempt followed by a retry) — `orders.status`
 * only ever moves `pending_payment` -> `paid` from a row here reaching
 * `succeeded`, and that transition happens exclusively in
 * `src/domains/payments/queries.ts`'s `markPaymentSucceeded`, never from
 * a route handler trusting a redirect query string directly (§5 "Never
 * trust the browser return page as proof of payment").
 *
 * `providerRef` is the provider's own transaction/authority identifier
 * (e.g. ZarinPal's `Authority`) — what a callback arrives with, and what
 * `getPaymentByProviderRef` looks up. `uniqueIndex(provider, providerRef)`
 * both prevents two payment rows from racing to claim the same gateway
 * transaction and is the mechanism idempotent-callback handling relies
 * on: the callback finds *the* row for that reference, then transitions
 * it with a conditional `WHERE status = 'pending'` (mirrors the
 * inventory-decrement pattern in `orders/queries.ts`) so a duplicate
 * callback for an already-`succeeded`/`failed` row is a safe no-op, not
 * a double-charge or a double order-status flip.
 */
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "succeeded", "failed"]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** Which `PaymentProvider` implementation created this row, e.g.
     * `"mock"`. Never a real gateway name unless a real adapter is
     * actually wired in (rule A.17). */
    provider: text("provider").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    amountToman: integer("amount_toman").notNull(),
    /** The provider's transaction/authority id. Unique per provider so a
     * callback can be looked up unambiguously and so two initiations
     * can never collide on the same reference. */
    providerRef: text("provider_ref").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("payments_provider_provider_ref_idx").on(table.provider, table.providerRef),
    index("payments_order_id_idx").on(table.orderId),
    check("payments_amount_positive", sql`${table.amountToman} > 0`),
  ],
);

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  events: many(paymentEvents),
}));

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
