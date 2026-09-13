import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/domains/payments/provider";
import { finalizePaymentVerification } from "@/domains/payments/queries";

/**
 * The callback endpoint the mock gateway's simulator page
 * (`/payment/mock/[authority]`) redirects to — structurally the same
 * shape a real redirect-based Iranian gateway (ZarinPal-style) would hit:
 * a `GET` with `Authority`/`Status` query params, no request body, no
 * auth cookie required (the gateway, not the customer's browser session,
 * is the caller).
 *
 * Per TRENDS_PROJECT_CONTEXT.md §5 "Never trust the browser return page
 * as proof of payment": this handler does **not** read `Status` and mark
 * anything paid. It calls `getPaymentProvider().verify()` (the
 * server-to-server "ask the gateway" step — mocked here, but the same
 * call shape a real adapter needs) and only acts on *that* answer, via
 * `finalizePaymentVerification`, which is also what makes a duplicate
 * invocation of this exact URL (gateway retry, or the customer's browser
 * re-requesting it) a safe no-op — see that function's header comment.
 *
 * This route only exists behind the mock provider — if `PAYMENT_PROVIDER`
 * isn't `mock`, `getPaymentProvider()` returns the not-configured stub,
 * whose `verify()` always reports `false`, so hitting this URL directly
 * in a misconfigured environment can never forge a payment.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authority = url.searchParams.get("Authority") ?? "";
  const status = url.searchParams.get("Status") ?? "";

  const provider = getPaymentProvider();
  const { verified } = await provider.verify({ Authority: authority, Status: status });

  const outcome = await finalizePaymentVerification(provider.name, authority, verified, {
    Authority: authority,
    Status: status,
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;

  if (outcome.status === "not_found") {
    // An authority this app never issued a `payments` row for — a
    // forged/garbled callback, not a real gateway response. Redirect to
    // the homepage rather than leaking whether any particular order
    // exists.
    return NextResponse.redirect(new URL("/", siteUrl));
  }

  const resultParam =
    outcome.status === "succeeded"
      ? "success"
      : outcome.status === "failed"
        ? "failed"
        : outcome.status === "already_processed"
          ? "already-processed"
          : "failed";

  return NextResponse.redirect(new URL(`/order/${outcome.orderNumber}?payment=${resultParam}`, siteUrl));
}
