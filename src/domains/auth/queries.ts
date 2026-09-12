import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, type NewUser, type User } from "@/lib/db/schema";
import { normalizeIranianMobile } from "@/lib/utils/phone";
import { hashPassword } from "./password";

/**
 * The only sanctioned place for application code to read/write `users`
 * rows, per TRENDS_PROJECT_CONTEXT.md §4.2 ("database access is
 * isolated") — same pattern as `src/domains/catalog/queries.ts`.
 */

/**
 * Re-normalizes `mobile` here too, not just at the Zod-validation layer
 * (`src/lib/validation/auth.ts`'s `mobileSchema`) — a smoke test caught
 * that calling this function with an un-normalized number (e.g. a future
 * caller, admin tool, or script that forgets to run the value through
 * the schema first) would silently look up/compare against the wrong
 * string and let a "duplicate" mobile slip past. This is the domain
 * layer's own defense-in-depth, not a replacement for the schema
 * validation callers should still be doing (for its user-facing error
 * messages) — see TRENDS_PROJECT_CONTEXT.md §4.2 "database access is
 * isolated": this function is the actual boundary, so it shouldn't trust
 * every caller to have already normalized correctly.
 */
function normalizeOrThrow(mobile: string): string {
  const normalized = normalizeIranianMobile(mobile);
  if (!normalized) throw new Error(`Invalid Iranian mobile number: ${mobile}`);
  return normalized;
}

export async function findUserByMobile(mobile: string): Promise<User | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.mobile, normalizeOrThrow(mobile)))
    .limit(1);
  return row ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export type CreateUserInput = {
  mobile: string;
  fullName: string;
  email: string | null;
  password: string;
};

/** Throws `MobileAlreadyRegisteredError` if the mobile is taken — the
 * `users_mobile_idx` unique index is the real source of truth (never
 * rely on the app-level check alone, rule "Database" section), this is
 * just a pre-check for a friendlier error message than a raw constraint
 * violation. */
export class MobileAlreadyRegisteredError extends Error {
  constructor() {
    super("این شماره موبایل قبلاً ثبت شده است");
    this.name = "MobileAlreadyRegisteredError";
  }
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const mobile = normalizeOrThrow(input.mobile);
  const existing = await findUserByMobile(mobile);
  if (existing) throw new MobileAlreadyRegisteredError();

  const passwordHash = await hashPassword(input.password);
  const newUser: NewUser = {
    mobile,
    fullName: input.fullName,
    email: input.email,
    passwordHash,
  };

  try {
    const [row] = await db.insert(users).values(newUser).returning();
    if (!row) throw new Error("User insert returned no row");
    return row;
  } catch (error) {
    // Race-condition fallback: two concurrent registrations for the same
    // mobile both pass the pre-check above; the database's unique index
    // is what actually prevents the duplicate. Surface the same friendly
    // error in that case instead of a raw Postgres error.
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
      throw new MobileAlreadyRegisteredError();
    }
    throw error;
  }
}

export async function updateUserPassword(userId: string, newPlainTextPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPlainTextPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}
