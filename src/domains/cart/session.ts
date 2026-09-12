import { cookies } from "next/headers";

/**
 * The guest cart cookie: its value is a `carts.id` (see `carts.ts`'s
 * header comment for why a random `uuid` is an acceptable bearer token
 * here). `HttpOnly` so client JS can't read/tamper with it (same
 * "never trust/expose this to the browser" instinct as auth tokens,
 * rule A.12/G, even though a cart id isn't a secret the way a session
 * token is) and `SameSite=Lax` to match the session cookie NextAuth
 * already sets.
 */
const GUEST_CART_COOKIE = "trends_guest_cart";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Read-only: safe to call from Server Components (rendering) as well as
 * Server Actions/Route Handlers. Returns `null` if no guest cart cookie
 * is set — callers must not assume a cookie exists. */
export async function readGuestCartId(): Promise<string | null> {
  const store = await cookies();
  return store.get(GUEST_CART_COOKIE)?.value ?? null;
}

/** Only callable from a Server Action or Route Handler (Next.js throws
 * if called during rendering) — see `src/domains/cart/actions.ts`. */
export async function setGuestCartId(cartId: string): Promise<void> {
  const store = await cookies();
  store.set(GUEST_CART_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
}

/** Called after a guest cart has been merged into a user's cart on login
 * (or found empty/invalid) so the browser stops presenting it. */
export async function clearGuestCartId(): Promise<void> {
  const store = await cookies();
  store.delete(GUEST_CART_COOKIE);
}
