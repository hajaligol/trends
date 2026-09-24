"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { retryPaymentAction } from "@/domains/orders/actions";

/**
 * Re-initiates payment for an order still stuck in `pending_payment` —
 * e.g. the customer closed the (mock, currently) gateway tab without
 * choosing an outcome. Calls the same server-authoritative
 * `retryPaymentAction` a real gateway integration would use; this
 * component only ever navigates to whatever `redirectUrl` that action
 * returns, it never marks anything paid itself.
 */
export function RetryPaymentButton({ orderNumber }: { orderNumber: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await retryPaymentAction(orderNumber);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      setError(result.paymentNote);
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button type="button" onClick={handleClick} disabled={isPending} className="disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "در حال انتقال..." : "پرداخت مجدد"}
      </Button>
      {error && (
        <p role="alert" className="text-[0.8rem] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
