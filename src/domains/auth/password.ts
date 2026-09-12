import bcrypt from "bcryptjs";

/**
 * Thin wrapper around `bcryptjs` (a mature, widely-used password hashing
 * library — rule F.2 "prefer established libraries over homegrown
 * security"), so nothing else in the codebase imports `bcryptjs`
 * directly or picks its own cost factor.
 *
 * 12 rounds is bcrypt's commonly recommended minimum for new systems in
 * 2026 hardware terms; revisit in Phase 13's security hardening pass if
 * server CPU budget or OWASP guidance changes.
 */
const SALT_ROUNDS = 12;

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainTextPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, hash);
}
