"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cancelOrderAction } from "@/domains/orders/actions";

/**
 * Lets a customer cancel their own order from an appropriate status —
 * `cancelOrderAction`/`cancelOrderForUser` (server-side) are what
 * actually enforce *which* statuses that's legal from; this component
 * only renders when the page already knows the status qualifies (see
 * `canCustomerCancel` at the call site in
 * `src/app/order/[orderNumber]/page.tsx`), but the real guarantee is
 * server-side, not this conditional render.
 */
export function CancelOrderButton({ orderNumber }: { orderNumber: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await cancelOrderAction(orderNumber, reason);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIsOpen(false);
      router.refresh();
    });
  }

  if (!isOpen) {
    return (
      <Button type="button" variant="danger-outline" size="sm" onClick={() => setIsOpen(true)}>
        لغو سفارش
      </Button>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-2 rounded-[var(--radius-md)] border border-line bg-white p-4 text-[0.85rem]">
      <p className="text-ink">آیا از لغو این سفارش مطمئن هستید؟</p>
      <label className="flex flex-col gap-1">
        <span className="text-text-secondary">دلیل لغو (اختیاری)</span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={300}
          rows={2}
          className="rounded-[var(--radius-sm)] border border-line px-3 py-2 text-[0.85rem] outline-none focus:border-ink"
        />
      </label>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={handleConfirm}
          disabled={isPending}
          className="sm:flex-1 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "در حال لغو..." : "بله، سفارش لغو شود"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(false)}
          disabled={isPending}
          className="sm:flex-1 disabled:cursor-not-allowed disabled:opacity-60"
        >
          انصراف
        </Button>
      </div>
    </div>
  );
}
