import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { passwordResetTokens } from "@/lib/db/schema";

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes — short-lived, single-use.

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Issues a new single-use password reset token for `userId`. Returns the
 * *raw* token (only ever held in memory here, to be sent via
 * `src/domains/auth/notifications.ts`) — only its SHA-256 hash is
 * persisted, per `password-reset-tokens.ts`'s schema comment.
 */
export async function issuePasswordResetToken(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString("hex");
  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  return rawToken;
}

/**
 * Validates a raw token from a reset link/form. Returns the associated
 * `userId` if the token exists, hasn't expired, and hasn't already been
 * used — `null` otherwise. Does not mark it used; call
 * `consumePasswordResetToken` after the password is actually updated, so
 * a failed update doesn't burn the token.
 */
export async function verifyPasswordResetToken(rawToken: string): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(rawToken);
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt)))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;

  return { userId: row.userId };
}

export async function consumePasswordResetToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt)));
}
