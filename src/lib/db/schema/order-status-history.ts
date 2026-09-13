import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { orderStatusEnum } from "./order-status";
import { users } from "./users";

/**
 * An append-only audit trail of every `orders.status` transition, per
 * TRENDS_PROJECT_CONTEXT.md §12's data model list ("order_status_history")
 * and CLAUDE_BUILD_INSTRUCTIONS.txt Phase 10 ("order status timeline").
 * `orders.status` itself only ever reflects the *current* state (same
 * relationship `payments`/`payment_events` already has, see that file's
 * header comment) — this table is what lets a customer see a timeline
 * and an operator answer "when did this change, and who changed it."
 *
 * Written from exactly three places, all inside the same transaction as
 * the status update itself so the two can never drift:
 * - `finalizePaymentVerification` (Phase 9, `payments/queries.ts`) —
 *   `pending_payment -> paid`, actor `system`.
 * - `cancelOrderForUser` (this phase, `orders/queries.ts`) — actor
 *   `customer`.
 * - `adminTransitionOrderStatus` (this phase, `orders/queries.ts`) —
 *   actor `admin`.
 *
 * `fromStatus` is nullable only in principle (every real transition has
 * a prior status since `orders.status` always starts at
 * `pending_payment`); kept nullable rather than widening the enum for a
 * theoretical "order created" row, since order creation itself isn't a
 * status *transition*.
 *
 * `actorUserId` is nullable with `onDelete: "set null"` — a system-driven
 * transition (the payment callback) has no acting user at all, and an
 * admin/customer row must not disappear if that user's account is later
 * deleted; `actorRole` snapshots which kind of actor this was even if
 * `actorUserId` is later nulled out.
 */
export const orderStatusActorEnum = pgEnum("order_status_actor", ["customer", "admin", "system"]);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatusEnum("from_status"),
    toStatus: orderStatusEnum("to_status").notNull(),
    actorRole: orderStatusActorEnum("actor_role").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("order_status_history_order_id_idx").on(table.orderId),
    index("order_status_history_created_at_idx").on(table.createdAt),
  ],
);

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
  actor: one(users, { fields: [orderStatusHistory.actorUserId], references: [users.id] }),
}));

export type OrderStatusHistoryRow = typeof orderStatusHistory.$inferSelect;
export type NewOrderStatusHistoryRow = typeof orderStatusHistory.$inferInsert;
