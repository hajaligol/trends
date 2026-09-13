import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getCurrentUser } from "@/domains/auth/actions";
import { getAddressesForUser } from "@/domains/addresses/queries";
import { getCurrentCartIdReadOnly } from "@/domains/cart/resolve";
import { getCartSummary } from "@/domains/cart/queries";
import { listShippingMethods } from "@/domains/shipping/methods";
import { CheckoutView } from "@/components/checkout/CheckoutView";

export const metadata: Metadata = {
  title: "تسویه حساب",
  robots: { index: false, follow: false },
};

/**
 * Checkout requires a signed-in customer — the address book
 * (`addresses`) is itself authenticated-only (Phase 6), and building a
 * parallel guest-address model is real, separate scope, not a natural
 * side effect of this phase (documented in PROGRESS.md as an
 * assumption, not silently invented, per rule A.18). An unauthenticated
 * visitor is sent to `/login`, the same as `/account`'s layout — there's
 * no `callbackUrl` round-trip back to `/checkout` yet since `loginAction`
 * (Phase 6, already complete) doesn't support one; not modifying that
 * completed flow just to add a redirect target is deliberate (rule B.4
 * "do not redo completed work unless fixing a defect" — this isn't a
 * defect, just a nicety), documented as a follow-up in PROGRESS.md.
 */
export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const cartId = await getCurrentCartIdReadOnly();
  const cart = await getCartSummary(cartId);
  if (cart.items.length === 0) redirect("/");

  const addresses = await getAddressesForUser(user.id);
  const shippingMethods = listShippingMethods(cart.subtotalToman);

  return (
    <main className="py-[clamp(40px,7vw,80px)]">
      <Container>
        <h1 className="mb-8 text-[1.6rem] font-bold">تسویه حساب</h1>
        <CheckoutView initialCart={cart} initialAddresses={addresses} shippingMethods={shippingMethods} />
      </Container>
    </main>
  );
}
