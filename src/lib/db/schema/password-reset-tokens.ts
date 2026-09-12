import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Single-use password reset tokens.
 *
 * Only a SHA-256 hash of the token is stored (`tokenHash`), the same
 * "never store the secret itself" principle as `users.passwordHash` — if
 * this table ever leaked, nobody could reset an account with it. The raw
 * token is emailed/SMS'd to the user (see
 * `src/domains/auth/notifications.ts`) and never persisted.
 *
 * `usedAt` (nullable) rather than deleting the row on use: keeps a small
 * audit trail ("was this token already consumed") and lets expired/used
 * tokens give a clear error instead of a generic "not found".
 */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("password_reset_tokens_user_id_idx").on(table.userId),
    index("password_reset_tokens_token_hash_idx").on(table.tokenHash),
  ],
);

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
