import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { formatToman } from "@/lib/utils/money";

export const metadata: Metadata = {
  title: "شبیه‌ساز درگاه پرداخت (تست)",
  robots: { index: false, follow: false },
};

/**
 * A **clearly-labeled test-only page** standing in for a real Iranian
 * payment gateway's hosted checkout page — it exists only because
 * `MockPaymentProvider.initiate()` (`src/domains/payments/provider.ts`)
 * redirects here instead of to a real external gateway, per rule A.17
 * ("do not fabricate live payment credentials or claim a payment
 * integration is live when it is not"). A real deployment with a real
 * `PAYMENT_PROVIDER` configured never reaches this route at all.
 *
 * The two buttons below are literally just links to the callback route
 * with `Status=OK`/`Status=NOK` — standing in for "the customer
 * completed/abandoned payment on the gateway's own hosted page and the
 * gateway is now redirecting them back". Nothing here writes to the
 * database or marks anything paid; that only happens once
 * `/api/payments/callback/mock` calls `provider.verify()` and
 * `finalizePaymentVerification` (see that route's header comment).
 */
export default async function MockPaymentGatewayPage({
  params,
  searchParams,
}: {
  params: Promise<{ authority: string }>;
  searchParams: Promise<{ orderNumber?: string; amount?: string }>;
}) {
  const { authority } = await params;
  const { orderNumber, amount } = await searchParams;
  const amountToman = amount ? Number(amount) : null;

  const callbackUrl = (status: "OK" | "NOK") =>
    `/api/payments/callback/mock?Authority=${encodeURIComponent(authority)}&Status=${status}`;

  return (
    <main className="py-[clamp(40px,7vw,80px)]">
      <Container className="mx-auto flex max-w-[480px] flex-col gap-6 text-center">
        <div className="rounded-[var(--radius-md)] bg-[#FBE1B4]/50 px-4 py-2 text-[0.8rem] text-ink">
          این یک صفحه شبیه‌سازی درگاه پرداخت است و صرفاً برای محیط تست/توسعه استفاده می‌شود — پرداخت واقعی
          انجام نمی‌شود.
        </div>

        <div className="rounded-[var(--radius-lg)] border border-line bg-white p-6">
          <h1 className="mb-4 text-[1.15rem] font-bold">درگاه پرداخت آزمایشی</h1>
          {orderNumber && (
            <p className="mb-1 text-[0.88rem] text-text-secondary">
              سفارش: <span dir="ltr">{orderNumber}</span>
            </p>
          )}
          {amountToman !== null && (
            <p className="mb-6 text-[1.2rem] font-bold text-ink">{formatToman(amountToman)}</p>
          )}

          <div className="flex flex-col gap-3">
            <ButtonLink href={callbackUrl("OK")} variant="primary" className="justify-center">
              شبیه‌سازی پرداخت موفق
            </ButtonLink>
            <ButtonLink href={callbackUrl("NOK")} variant="ghost" className="justify-center">
              شبیه‌سازی پرداخت ناموفق / انصراف
            </ButtonLink>
          </div>
        </div>
      </Container>
    </main>
  );
}
