import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findUserByMobile, findUserRoleById } from "@/domains/auth/queries";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { verifyPassword } from "@/domains/auth/password";
import { loginSchema } from "@/lib/validation/auth";

/**
 * Session strategy: **Credentials provider + JWT session, no database
 * adapter.**
 *
 * NextAuth database adapters (`@auth/drizzle-adapter` etc.) model
 * OAuth-shaped identity (`accounts`, `verificationTokens`, provider
 * `sub`s) and are unnecessary — and a poor fit — for a single
 * mobile+password credentials flow. With the Credentials provider and
 * `session.strategy: "jwt"`, NextAuth needs no adapter at all: it signs
 * a JWT (using `AUTH_SECRET`) into a `HttpOnly`, `Secure` (in
 * production), `SameSite=Lax` cookie it manages itself. This is what
 * satisfies rule A.12/G ("no auth tokens in localStorage") — the token
 * never touches client-side JavaScript or storage; the browser just
 * carries the cookie automatically.
 *
 * `users`/`password_reset_tokens`/`addresses` (this project's own
 * Drizzle tables) remain the actual account data; `authorize()` below is
 * the only place NextAuth talks to them, via `src/domains/auth/queries.ts`
 * like every other piece of app code.
 *
 * Role-based authorization (`role: "customer" | "staff" | "admin"`) is
 * threaded through the `jwt`/`session` callbacks so `role` is available
 * on `session.user.role` for every Server Component/Server Action
 * without a fresh database read per request — Phase 11's admin routes
 * will read this, not re-derive it. See `next-auth.d.ts` for the
 * corresponding type augmentation.
 */
/**
 * Fixed bcrypt hash compared against when the mobile is unknown, so a miss
 * costs the same CPU time as a wrong password (no account-enumeration timing
 * side channel). It matches no real password.
 */
const DUMMY_PASSWORD_HASH = "$2b$12$CwTycUXWue0Thq9StjUM0uJ8.nMYNVfqMDFEyh0Z4aJkQ4k4vqT5G";

/**
 * The JWT carries `role`, so without re-checking, a demoted or deleted account
 * would keep its old privileges until the token expires (30 days by default).
 * The role is re-read from the database at most once per TTL per user; the
 * cache is per-process, like the rate limiter.
 */
const ROLE_TTL_MS = 30_000;
const roleCache = new Map<string, { role: "customer" | "staff" | "admin" | null; at: number }>();

async function currentRole(userId: string) {
  const now = Date.now();
  const hit = roleCache.get(userId);
  if (hit && now - hit.at < ROLE_TTL_MS) return hit.role;
  if (roleCache.size > 5_000) roleCache.clear();
  const role = await findUserRoleById(userId);
  roleCache.set(userId, { role, at: now });
  return role;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  // Required for `next start` (and most non-Vercel hosts) — NextAuth v5
  // refuses requests whose `Host` header it can't already infer as
  // trusted (e.g. from Vercel's platform env vars), throwing
  // `UntrustedHost` otherwise. `NEXT_PUBLIC_SITE_URL` (see
  // `src/lib/site-config.ts`) is this deployment's single source of
  // truth for what host is legitimate, so trusting the incoming request
  // here doesn't open anything up beyond what's already true of a normal
  // Node/Next.js deployment behind a reverse proxy — it does not affect
  // `AUTH_SECRET`-based cookie/JWT signing, which is the actual security
  // boundary. Revisit if/when a specific hosting platform's docs say
  // otherwise (see https://errors.authjs.dev#untrustedhost).
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        mobile: { label: "شماره موبایل", type: "text" },
        password: { label: "رمز عبور", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        // NextAuth also exposes this provider at POST /api/auth/callback/credentials,
        // which bypasses `loginAction`'s own limiter — so brute-force limits must
        // live here, where every sign-in path passes through.
        const ip = await getClientIp().catch(() => "unknown");
        if (
          !checkRateLimit(`auth-ip:${ip}`, 30, 5 * 60_000).allowed ||
          !checkRateLimit(`auth-mobile:${parsed.data.mobile}`, 20, 15 * 60_000).allowed
        ) {
          return null;
        }

        const user = await findUserByMobile(parsed.data.mobile);
        const passwordMatches = await verifyPassword(
          parsed.data.password,
          user?.passwordHash ?? DUMMY_PASSWORD_HASH,
        );
        if (!user || !passwordMatches) return null;

        return {
          id: user.id,
          mobile: user.mobile,
          name: user.fullName,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only present on the initial sign-in call; on
      // subsequent requests NextAuth decodes the existing token and
      // calls `jwt()` with `user: undefined`, so previously-attached
      // claims must be read back off `token`, not re-derived.
      if (user) {
        token.id = user.id;
        token.mobile = user.mobile;
        token.role = user.role;
        return token;
      }
      // Existing session: re-validate against the database (see ROLE_TTL_MS).
      if (token.id) {
        const role = await currentRole(token.id);
        if (!role) return null; // account deleted -> end the session
        token.role = role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.mobile = token.mobile;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
