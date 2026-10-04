"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/feedback/ToastProvider";
import { adminTransitionOrderStatusAction } from "@/domains/orders/admin-actions";
import { ORDER_STATUS_LABELS } from "@/domains/orders/lifecycle";
import type { OrderStatus } from "@/domains/orders/lifecycle";
import { ORDER_STATUS_TONES } from "@/components/admin/status";
import { adminButton, StatusBadge } from "@/components/admin/ui/layout";
import { AlertTriangleIcon, CheckCircleIcon } from "@/components/admin/ui/icons";
import { Spinner, TextareaField, TextField } from "@/components/admin/ui/form";

/** What each next step means in plain words, so the operator sees the
 * consequence before pressing the button. */
const STATUS_HINTS: Partial<Record<OrderStatus, string>> = {
  processing: "سفارش در حال بسته‌بندی است.",
  shipped: "سفارش به پست یا پیک تحویل داده شده است.",
  delivered: "سفارش به دست مشتری رسیده است.",
  cancelled: "موجودی کالاهای این سفارش به انبار برمی‌گردد و این کار قابل بازگشت نیست.",
  refunded: "فقط ثبت می‌کند که بازپرداخت خارج از سیستم انجام شده؛ هیچ پولی از درگاه برگردانده نمی‌شود.",
};

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
  currentStatus,
}: {
  orderNumber: string;
  allowedNextStatuses: readonly OrderStatus[];
  currentStatus: OrderStatus;
}) {
  const [toStatus, setToStatus] = useState<OrderStatus | "">(allowedNextStatuses[0] ?? "");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showToast } = useToast();

  if (allowedNextStatuses.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-bg p-4 text-[0.86rem] leading-6 text-text-secondary">
        <CheckCircleIcon width={20} height={20} className="mt-0.5 shrink-0 text-[#6b7d3e]" />
        <p className="m-0">
          این سفارش در وضعیت نهایی («{ORDER_STATUS_LABELS[currentStatus]}») قرار دارد و دیگر قابل تغییر نیست.
        </p>
      </div>
    );
  }

  const isDestructive = toStatus === "cancelled";

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!toStatus) return;
    setError(null);
    const target = toStatus;
    startTransition(async () => {
      const result = await adminTransitionOrderStatusAction(orderNumber, target, trackingNumber, note);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTrackingNumber("");
      setNote("");
      showToast(`وضعیت سفارش به «${ORDER_STATUS_LABELS[target]}» تغییر کرد`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-[0.82rem] text-text-secondary">
        وضعیت فعلی:
        <StatusBadge tone={ORDER_STATUS_TONES[currentStatus]}>{ORDER_STATUS_LABELS[currentStatus]}</StatusBadge>
      </div>

      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-[0.84rem] font-medium text-ink">انتقال به</legend>
        {allowedNextStatuses.map((status) => (
          <label
            key={status}
            className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand/50 ${
              toStatus === status ? "border-ink bg-ink/[0.03]" : "border-line hover:border-ink/30"
            }`}
          >
            <input
              type="radio"
              name="toStatus"
              value={status}
              checked={toStatus === status}
              onChange={() => setToStatus(status)}
              className="mt-1 h-4 w-4 accent-[var(--color-brand)]"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-[0.9rem] font-semibold text-ink">{ORDER_STATUS_LABELS[status]}</span>
              {STATUS_HINTS[status] && <span className="text-[0.78rem] leading-5 text-text-secondary">{STATUS_HINTS[status]}</span>}
            </span>
          </label>
        ))}
      </fieldset>

      {toStatus === "shipped" && (
        <TextField
          label="کد رهگیری مرسوله"
          name="trackingNumber"
          optional
          ltr
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
          hint="این کد در صفحه سفارش برای مشتری نمایش داده می‌شود."
        />
      )}

      <TextareaField
        label="یادداشت داخلی"
        name="note"
        optional
        rows={2}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        hint="فقط در تاریخچه سفارش ثبت می‌شود."
      />

      {isDestructive && (
        <p className="m-0 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-[0.82rem] leading-6 text-red-800">
          <AlertTriangleIcon width={18} height={18} className="mt-0.5 shrink-0" />
          لغو سفارش برگشت‌ناپذیر است. لطفاً پیش از ادامه مطمئن شوید.
        </p>
      )}

      {error && (
        <p role="alert" className="m-0 rounded-[var(--radius-md)] bg-red-50 px-4 py-2.5 text-[0.84rem] text-red-800">
          {error}
        </p>
      )}

      <button type="submit" disabled={isPending || !toStatus} className={adminButton(isDestructive ? "danger" : "primary", "md", "w-full")}>
        {isPending && <Spinner />}
        {isPending ? "در حال اعمال..." : isDestructive ? "لغو سفارش" : "اعمال تغییر وضعیت"}
      </button>
    </form>
  );
}
