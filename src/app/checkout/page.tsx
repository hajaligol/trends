import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { getCurrentUser } from "@/domains/auth/actions";
import { getAddressesForUser } from "@/domains/addresses/queries";
import { getCurrentCartIdReadOnly } from "@/domains/cart/resolve";
import { getCartSummary } from "@/domains/cart/queries";
import { listShippingMethods } from "@/domains/shipping/methods";
import { CheckoutView } from "@/components/checkout/CheckoutView";

export const metadata: Metadata = {
  title: "سبد خرید و تسویه حساب",
  robots: { index: false, follow: false },
};

/**
 * The header's cart icon links here, so this page doubles as the cart:
 * it is a three-stage flow (سبد خرید → ارسال → پرداخت), see
 * `CheckoutView`. Stage 1 works for guests (a guest cart exists since
 * Phase 7); stages 2–3 need an account, because the address book is
 * authenticated-only (Phase 6) — a guest reaching stage 2 is asked to
 * sign in, and their cart merges into their account on login.
 *
 * An empty cart no longer redirects away: opening the cart icon on an
 * empty cart must show an empty state, not bounce the visitor home.
 */
export default async function CheckoutPage() {
  const user = await getCurrentUser();

  const cartId = await getCurrentCartIdReadOnly();
  const cart = await getCartSummary(cartId);

  const addresses = user ? await getAddressesForUser(user.id) : [];
  const shippingMethods = await listShippingMethods(cart.subtotalToman);

  return (
    <main className="py-[clamp(28px,5vw,64px)]">
      <Container>
        <CheckoutView
          initialCart={cart}
          initialAddresses={addresses}
          shippingMethods={shippingMethods}
          isAuthenticated={Boolean(user)}
        />
      </Container>
    </main>
  );
}
