import { relations } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { payments } from "./payments";

/**
 * An append-only, reconciliation-friendly audit trail for every payment
 * lifecycle event — §5 "reconciliation-friendly records" and §9
 * "Payment state is auditable". Written on *every* callback invocation
 * (including duplicates/no-ops), unlike `payments` itself which only
 * reflects the current state — this table is what lets an operator
 * later answer "did the gateway call us back twice for this order, and
 * what did each call say".
 *
 * `payload` stores whatever the provider handed over (query params for
 * a redirect-based gateway) as JSON, for later reconciliation against
 * the gateway's own dashboard — never card data (rule A.17/G: "Do not
 * store card numbers/CVV", and a redirect-based gateway never hands the
 * store raw card data in the first place).
 */
export const paymentEventTypeEnum = pgEnum("payment_event_type", [
  "initiated",
  "callback_received",
  "verified_succeeded",
  "verified_failed",
  "duplicate_ignored",
]);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    type: paymentEventTypeEnum("type").notNull(),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("payment_events_payment_id_idx").on(table.paymentId)],
);

export const paymentEventsRelations = relations(paymentEvents, ({ one }) => ({
  payment: one(payments, { fields: [paymentEvents.paymentId], references: [payments.id] }),
}));

export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type NewPaymentEvent = typeof paymentEvents.$inferInsert;
