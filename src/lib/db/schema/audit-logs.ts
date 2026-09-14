import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { index } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * General-purpose "who did what, when" trail for privileged admin
 * mutations, per TRENDS_PROJECT_CONTEXT.md §12 (`audit_logs` in the data
 * model direction) and §11 ("audit logs for sensitive admin actions").
 *
 * Phase 10 already established a narrow, order-specific precedent
 * (`order_status_history`) — this table is the general-purpose
 * counterpart for everything else an admin/staff user does (product
 * edits, coupon changes, role changes, settings changes, stock
 * adjustments, etc.), per this phase's handoff note that the two are
 * genuinely separate schema concerns, not one extending the other.
 *
 * `actorId` is `onDelete: "set null"` rather than `"cascade"` or
 * `"restrict"` — deleting a staff/admin user account (not currently even
 * possible from the UI, but the FK should still be safe if it ever is)
 * must never silently destroy the historical audit trail those actions
 * produced; the log entry survives with `actorId = null` and whatever
 * `actorMobile` snapshot was captured at write time.
 *
 * `payload` is a JSON string (not a `jsonb` column) holding a small,
 * intentionally loose diff/context blob (e.g. `{"before":{...},
 * "after":{...}}` or `{"deltaStock":5,"reason":"..."}") — every admin
 * mutation this phase adds has a different shape of "what changed," and
 * per rule F.6 ("prefer fewer dependencies"/simpler structures) a single
 * flexible text column is simpler than one `jsonb` column plus a second
 * migration every time a new action's payload shape needs a new indexed
 * field. Never log secrets (payment credentials, password hashes,
 * tokens) into this column — see call sites in
 * `src/domains/analytics/audit.ts`.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorMobile: text("actor_mobile"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    payload: text("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_created_at_idx").on(table.createdAt),
    index("audit_logs_entity_type_entity_id_idx").on(table.entityType, table.entityId),
    index("audit_logs_actor_id_idx").on(table.actorId),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
