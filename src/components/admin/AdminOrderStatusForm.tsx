"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { adminTransitionOrderStatusAction } from "@/domains/orders/admin-actions";
import { ORDER_STATUS_LABELS } from "@/domains/orders/lifecycle";
import type { OrderStatus } from "@/domains/orders/lifecycle";

/**
 * Renders only the transitions `getAdminAllowedNextStatuses` (server
 * side, at the page level) says are legal from the order's *current*
 * status — but the real enforcement is
 * `adminTransitionOrderStatusAction` re-checking both role and
 * transition legality server-side, never this form. A forged POST for a
 * status not in `allowedNextStatuses` is rejected there regardless of
 * what this component rendered.
 */
export function AdminOrderStatusForm({
  orderNumber,
  allowedNextStatuses,
}: {
  orderNumber: string;
  allowedNextStatuses: readonly OrderStatus[];
}) {
  const [toStatus, setToStatus] = useState<OrderStatus | "">(allowedNextStatuses[0] ?? "");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (allowedNextStatuses.length === 0) {
    return <p className="text-[0.85rem] text-text-secondary">این سفارش در وضعیت نهایی قرار دارد.</p>;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!toStatus) return;
    setError(null);
    startTransition(async () => {
      const result = await adminTransitionOrderStatusAction(orderNumber, toStatus, trackingNumber, note);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTrackingNumber("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-[0.85rem]">
      <label className="flex flex-col gap-1">
        <span className="text-text-secondary">وضعیت جدید</span>
        <select
          value={toStatus}
          onChange={(event) => setToStatus(event.target.value as OrderStatus)}
          className="rounded-[var(--radius-sm)] border border-line px-3 py-2 outline-none focus:border-ink"
        >
          {allowedNextStatuses.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      {toStatus === "shipped" && (
        <label className="flex flex-col gap-1">
          <span className="text-text-secondary">کد رهگیری مرسوله (اختیاری)</span>
          <input
            type="text"
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
            className="rounded-[var(--radius-sm)] border border-line px-3 py-2 outline-none focus:border-ink"
            dir="ltr"
          />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-text-secondary">یادداشت داخلی (اختیاری)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          className="rounded-[var(--radius-sm)] border border-line px-3 py-2 outline-none focus:border-ink"
        />
      </label>

      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit disabled:opacity-60">
        {isPending ? "در حال اعمال..." : "اعمال تغییر وضعیت"}
      </Button>
    </form>
  );
}
