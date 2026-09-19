"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SessionProvider, getSession, signOut, useSession } from "next-auth/react";

/**
 * Login and logout run as Server Actions, so the client `SessionProvider`
 * is never told the session changed — the header kept showing the old
 * state until a full reload. This re-checks the session whenever the
 * route changes (login redirects to `/account`, logout to `/`).
 *
 * - Signed in: `update()` refetches, so the header picks up the user.
 * - Signed out: `update()` is NOT enough — NextAuth ignores an empty
 *   (null) result and keeps the stale session in state. The client-side
 *   `signOut({ redirect: false })` is what makes the provider drop it.
 *   The cookie is already gone at that point, so this call only syncs
 *   the client state.
 *
 * The initial fetch is left to `SessionProvider` itself.
 */
function SessionRefreshOnNavigation() {
  const { data, update } = useSession();
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const currentSession = useRef(data);
  currentSession.current = data;

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    void (async () => {
      const fresh = await getSession();
      if (fresh) {
        await update();
      } else if (currentSession.current) {
        await signOut({ redirect: false });
      }
    })();
  }, [pathname, update]);

  return null;
}

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
  return (
    <SessionProvider>
      <SessionRefreshOnNavigation />
      {children}
    </SessionProvider>
  );
}
