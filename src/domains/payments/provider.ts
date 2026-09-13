/**
 * Payment-provider adapter boundary, per TRENDS_PROJECT_CONTEXT.md §5
 * "Payment" and §8 "payment abstraction boundary" acceptance criterion
 * ("Payment provider interface is ready"). This phase only needs the
 * *interface* to exist so checkout has somewhere real to hand off to —
 * wiring an actual Iranian gateway (initiation, callback verification,
 * idempotency, transaction records) is Phase 9's job
 * (CLAUDE_BUILD_INSTRUCTIONS.txt Phase 9 task list).
 *
 * Rule A.17 applies directly here: do not fabricate credentials or
 * claim a gateway is live. `PAYMENT_PROVIDER` is blank in `.env.example`
 * — `getPaymentProvider()` returns the one real implementation this repo
 * ships, `NotConfiguredPaymentProvider`, until a real adapter (e.g. a
 * `zarinpal.ts`) is added and wired in behind this same function. No
 * call site should ever branch on "is a provider configured" itself —
 * that check lives here, once.
 */

export type PaymentInitiationResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; reason: string };

export interface PaymentProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  /**
   * Starts a payment for an already-created order. A real provider
   * would call out to the gateway's API and return a redirect URL; the
   * order stays in `pending_payment` until a verified callback (Phase 9)
   * moves it to `paid`. Never call this and mark an order `paid` just
   * because it returned successfully — initiation is not verification
   * (TRENDS_PROJECT_CONTEXT.md §5: "Never trust the browser return page
   * as proof of payment").
   */
  initiate(order: { id: string; orderNumber: string; totalToman: number }): Promise<PaymentInitiationResult>;
}

/**
 * The only provider this repo actually ships right now. Its `initiate`
 * always fails with a clear, honest reason — it never pretends to
 * redirect anywhere, per rule A.17 ("do not fabricate live payment
 * credentials or claim a payment integration is live when it is not").
 */
class NotConfiguredPaymentProvider implements PaymentProvider {
  readonly name = "not-configured";
  readonly isConfigured = false;

  async initiate(): Promise<PaymentInitiationResult> {
    return {
      ok: false,
      reason: "درگاه پرداخت هنوز پیکربندی نشده است. سفارش شما به‌صورت در انتظار پرداخت ثبت شد.",
    };
  }
}

export function getPaymentProvider(): PaymentProvider {
  // `process.env.PAYMENT_PROVIDER` is intentionally unread beyond this
  // existence check — Phase 9 is what adds a real `switch` here mapping
  // e.g. "zarinpal" to a real adapter class. Checking for blank/unset
  // rather than assuming any non-empty value is a working integration
  // keeps this honest even if someone sets a placeholder value early.
  const configured = Boolean(process.env.PAYMENT_PROVIDER?.trim());
  if (!configured) return new NotConfiguredPaymentProvider();
  // No real adapters exist yet — fall through to the same honest stub
  // rather than guessing at a provider name (rule A.17).
  return new NotConfiguredPaymentProvider();
}
