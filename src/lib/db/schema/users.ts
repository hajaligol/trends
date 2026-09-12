import { relations } from "drizzle-orm";
import { boolean, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { addresses } from "./addresses";

/**
 * Customer/staff accounts.
 *
 * Auth strategy (Phase 6): password-based credentials, session handled by
 * NextAuth v5 (Auth.js) with the JWT strategy — a signed, HttpOnly cookie,
 * never `localStorage` (rule A.12/G). NextAuth's Credentials provider
 * looks a user up by `mobile` and verifies `passwordHash` itself (see
 * `src/lib/auth/config.ts`); this table is *not* wired through a NextAuth
 * database adapter, since Credentials + JWT needs none — see that file's
 * header comment for the full reasoning.
 *
 * `mobile` is the canonical identifier (Iranian mobile number, normalized
 * to `+98XXXXXXXXXX` — see `src/lib/utils/phone.ts`), not email, per
 * TRENDS_PROJECT_CONTEXT.md §3/§5 ("Iranian mobile number support").
 * `email` is optional and unverified in this phase.
 *
 * `mobileVerified` exists now so a future real OTP/SMS provider (§3
 * "OTP-ready abstraction") has somewhere to record verification without a
 * schema change — nothing sets it to `true` yet, since no SMS provider is
 * configured (rule A.17: don't fabricate/claim a live integration).
 *
 * `role` is a Postgres enum, not a boolean `isAdmin`, per
 * TRENDS_PROJECT_CONTEXT.md §7 ("Prefer explicit roles/permissions over
 * one boolean"). Phase 6 only needs the column to exist and default
 * correctly; the admin area that actually checks `role === "admin"` for
 * privileged routes is Phase 11.
 */
export const userRoleEnum = pgEnum("user_role", ["customer", "staff", "admin"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mobile: text("mobile").notNull(),
    mobileVerified: boolean("mobile_verified").notNull().default(false),
    email: text("email"),
    fullName: text("full_name"),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("customer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_mobile_idx").on(table.mobile),
    // Only enforces uniqueness among rows that actually have an email —
    // Postgres unique indexes already treat NULL as distinct from NULL,
    // so multiple users with no email is fine without a partial index,
    // but being explicit documents the intent.
    uniqueIndex("users_email_idx").on(table.email),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/** Never pass a full `User` row (with `passwordHash`) to the client or
 * into a session/JWT payload. This is the shape that's safe to expose. */
export type PublicUser = Omit<User, "passwordHash">;

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
