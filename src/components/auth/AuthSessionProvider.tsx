"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * Wraps the app in NextAuth's client `SessionProvider` so `Header` (and
 * any future client component) can call `useSession()` instead of the
 * server reading `auth()`/`cookies()` in the root layout.
 *
 * This is a deliberate performance tradeoff, not an oversight: reading
 * the session in `RootLayout` (a Server Component every route shares)
 * would call `cookies()` on every single request, which opts the *entire
 * app* — including the static homepage Phase 2/4 verified as prerendered
 * — out of static rendering (TRENDS_PROJECT_CONTEXT.md §9 "Server
 * Components by default", "static/ISR-like rendering where appropriate").
 * `SessionProvider` instead fetches `/api/auth/session` once on the
 * client after hydration, so the header's logged-in state appears a
 * moment after paint rather than blocking/forcing SSR — an accepted,
 * widely-used tradeoff for exactly this "nav shows auth state" case.
 *
 * This does **not** weaken the actual security boundary anywhere: every
 * protected route (`/account/*`) and every mutation (Server Actions in
 * `src/domains/auth/actions.ts` / `src/domains/addresses/actions.ts`)
 * independently calls `auth()` server-side and never trusts this
 * client-side session state for authorization — it's presentation only
 * (which nav links/buttons to show).
 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
