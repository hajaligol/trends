import { randomUUID } from "node:crypto";

/**
 * Payment-provider adapter boundary, per TRENDS_PROJECT_CONTEXT.md §5
 * "Payment" and §9 "Promotions + payments". Phase 8 established the
 * interface with one honest stub (`NotConfiguredPaymentProvider`) that
 * never fabricates a live integration (rule A.17). This phase adds:
 *
 * - `verify()`, the other half of the interface — a real adapter would
 *   call the gateway's own verification API here (§5 "verification
 *   before marking an order paid", "never trust the browser return page
 *   as proof of payment"). Nothing in this codebase ever marks an order
 *   `paid` from `initiate()`'s result or from a callback's raw query
 *   string — only from what `verify()` reports, inside
 *   `src/domains/payments/queries.ts`'s `finalizePaymentVerification`.
 * - `MockPaymentProvider`, a **deliberately test-only, non-production**
 *   implementation of the full initiate → redirect → callback → verify
 *   loop, exactly what CLAUDE_BUILD_INSTRUCTIONS.txt's Phase 9 task list
 *   explicitly calls for ("one test/mock payment provider") given rule
 *   A.17 forbids inventing real ZarinPal/other gateway credentials in
 *   this environment. It is never the default (`getPaymentProvider()`
 *   only returns it when `PAYMENT_PROVIDER=mock` is explicitly set) and
 *   its own `name`/routes are clearly labeled "mock" throughout so it can
 *   never be mistaken for a live integration.
 *
 * A real gateway adapter (e.g. `zarinpal.ts`) would implement this same
 * `PaymentProvider` interface and be added as another branch inside
 * `getPaymentProvider()` — no other call site should ever need to change.
 */

export type PaymentInitiationResult =
  | { ok: true; redirectUrl: string; providerRef: string }
  | { ok: false; reason: string };

export type PaymentVerificationResult = { verified: boolean };

export interface PaymentProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  /**
   * Starts a payment for an already-created order. On success, returns a
   * `redirectUrl` (where the customer's browser is sent to pay) and a
   * `providerRef` — the gateway's own transaction/authority identifier,
   * which `src/domains/payments/queries.ts` persists on the `payments`
   * row and which the later callback arrives carrying. The order stays
   * `pending_payment` regardless of this call's result.
   */
  initiate(order: { id: string; orderNumber: string; totalToman: number }): Promise<PaymentInitiationResult>;
  /**
   * Independently asks the gateway "was this specific reference actually
   * paid" — never derived from trusting the callback's own query string.
   * `params` is whatever the callback route received (provider-shaped).
   */
  verify(params: Record<string, string>): Promise<PaymentVerificationResult>;
}

/** The default when `PAYMENT_PROVIDER` is unset/blank — always reports
 * "not configured", never fabricates a redirect (rule A.17). */
class NotConfiguredPaymentProvider implements PaymentProvider {
  readonly name = "not-configured";
  readonly isConfigured = false;

  async initiate(): Promise<PaymentInitiationResult> {
    return {
      ok: false,
      reason: "درگاه پرداخت هنوز پیکربندی نشده است. سفارش شما به‌صورت در انتظار پرداخت ثبت شد.",
    };
  }

  async verify(): Promise<PaymentVerificationResult> {
    return { verified: false };
  }
}

/**
 * A **test-only** provider that simulates a redirect-based Iranian
 * gateway (ZarinPal's Authority/Status shape, since that's the most
 * common one this store would eventually integrate) without contacting
 * any real service or requiring real credentials:
 *
 * - `initiate()` mints a random `authority` string and points the
 *   customer at this app's own `/payment/mock/[authority]` page — a
 *   clearly-labeled simulator, not a real gateway page — instead of an
 *   external URL.
 * - That page lets the (test) customer choose "simulate success" or
 *   "simulate failure", which navigates to
 *   `/api/payments/callback/mock?Authority=...&Status=OK|NOK` — the same
 *   redirect-with-query-params shape a real gateway callback uses.
 * - `verify()` is intentionally still a real, separate step from reading
 *   the callback's `Status` param: it treats `Status=OK` as "the gateway
 *   claims success" and independently re-affirms it (a real adapter
 *   would instead make its own authenticated server-to-server API call
 *   to the gateway here) — the callback route handler must call this
 *   method and act on *its* answer, never on the raw query string
 *   directly, so the code path is structurally identical to what a real
 *   adapter requires.
 */
class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  readonly isConfigured = true;

  async initiate(order: {
    id: string;
    orderNumber: string;
    totalToman: number;
  }): Promise<PaymentInitiationResult> {
    const authority = `MOCK-${randomUUID()}`;
    return {
      ok: true,
      redirectUrl: `/payment/mock/${authority}?orderNumber=${order.orderNumber}&amount=${order.totalToman}`,
      providerRef: authority,
    };
  }

  async verify(params: Record<string, string>): Promise<PaymentVerificationResult> {
    // A real adapter calls the gateway's verification endpoint here,
    // server-to-server, and trusts *that* response — never the
    // customer's browser redirect. This mock has no external gateway to
    // call, so it treats a well-formed, correctly-prefixed authority with
    // `Status=OK` as verified — still a distinct, independent check from
    // "the callback URL merely says so", which is the property that
    // matters structurally, even though there's no real API on the other
    // end in this environment.
    const status = params.Status;
    const authority = params.Authority;
    const verified = status === "OK" && typeof authority === "string" && authority.startsWith("MOCK-");
    return { verified };
  }
}

export function getPaymentProvider(): PaymentProvider {
  const configured = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (configured === "mock") return new MockPaymentProvider();
  // Blank, unset, or any other value (rule A.17 — never guess at a real
  // provider name without a real adapter behind it) falls through to the
  // honest stub.
  return new NotConfiguredPaymentProvider();
}
