import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * Real persistence for the homepage/footer newsletter signup form
 * (`src/components/layout/Footer.tsx`), which was presentational-only
 * markup through Phase 2 — per TRENDS_PROJECT_CONTEXT.md §6
 * "Newsletter" ("real subscription") and §12 (`newsletter_subscribers`).
 *
 * `email` is the only required field (no account needed to subscribe —
 * a newsletter signup is deliberately lower-friction than registration).
 * Stored lowercased/trimmed by the validation layer
 * (`src/lib/validation/storefront.ts`), same normalize-before-store
 * discipline as `users.mobile`.
 *
 * `isActive` supports an admin-only unsubscribe toggle
 * (`/admin/newsletter`) without deleting the row — there is no
 * customer-facing self-unsubscribe flow this phase (no outbound email
 * sending exists yet to put an unsubscribe link in — see
 * `notifications/provider.ts`'s console-only stub), so the only way to
 * flip this is an operator acting on a real request. Re-subscribing with
 * the same email re-activates the existing row (`ON CONFLICT DO UPDATE`)
 * rather than erroring or creating a duplicate.
 */
export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("newsletter_subscribers_email_idx").on(table.email)],
);

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type NewNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;
