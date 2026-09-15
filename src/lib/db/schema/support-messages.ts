import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Real persistence for the public contact/support form
 * (`/contact`, Phase 12), per TRENDS_PROJECT_CONTEXT.md §6 "Support" and
 * CLAUDE_BUILD_INSTRUCTIONS.txt Phase 12 ("support/contact form" — "not
 * a fake form", rule G). Submittable by a signed-out visitor (`userId`
 * nullable) — a support request shouldn't require an account — but
 * records `userId` when the submitter happens to be signed in, purely as
 * admin-triage convenience (never used for authorization: any submitter,
 * logged in or not, can only ever act on their *own* submission, and
 * there is no customer-facing "my support messages" view this phase).
 *
 * `isResolved` is a plain boolean, not a multi-state enum — the simplest
 * representation of "an operator has dealt with this" per rule F.5,
 * matching `hero_slides`/`promo_banners`'s `isActive` pattern rather than
 * introducing a third schema shape for what's still just a two-state
 * flag in practice (nothing in TRENDS_PROJECT_CONTEXT.md asks for a
 * richer support-ticket lifecycle).
 */
export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    mobile: text("mobile"),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    isResolved: boolean("is_resolved").notNull().default(false),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("support_messages_is_resolved_idx").on(table.isResolved)],
);

export type SupportMessage = typeof supportMessages.$inferSelect;
export type NewSupportMessage = typeof supportMessages.$inferInsert;
