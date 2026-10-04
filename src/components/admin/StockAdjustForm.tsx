"use client";

import { useState } from "react";
import { adjustStockAction } from "@/domains/inventory/actions";
import type { ActionResult } from "@/domains/auth/roles";
import { AdminSubmitButton, FormAlert, TextField, useAdminAction } from "@/components/admin/ui/form";
import { useRouter } from "next/navigation";

const initialState: ActionResult = { ok: true };

const QUICK_REASONS = ["ورود کالای جدید", "شمارش انبار", "کالای آسیب‌دیده"];

/**
 * Inline stock change for one variant. «افزایش/کاهش» + a positive number is
 * easier to get right than typing a signed delta, so the sign is built from
 * the toggle; the Server Action still receives the same signed `delta` it
 * always did and re-validates it.
 */
export function StockAdjustForm({ variantId }: { variantId: string }) {
  const router = useRouter();
  const [direction, setDirection] = useState<1 | -1>(1);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [formKey, setFormKey] = useState(0);

  const [state, formAction] = useAdminAction(adjustStockAction, initialState, {
    successMessage: "موجودی به‌روزرسانی شد",
    onSuccess: () => {
      setAmount("");
      setReason("");
      setFormKey((value) => value + 1);
      router.refresh();
    },
  });

  const signedDelta = amount ? String(direction * Math.abs(Number(amount) || 0)) : "";

  return (
    <form key={formKey} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="delta" value={signedDelta} />
      <FormAlert state={state} />

      <div className="flex flex-wrap items-end gap-3">
        <div role="group" aria-label="نوع تغییر" className="flex rounded-full border border-line bg-bg p-1 text-[0.82rem]">
          {(
            [
              [1, "افزایش"],
              [-1, "کاهش"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={direction === value}
              onClick={() => setDirection(value)}
              className={`cursor-pointer rounded-full px-4 py-1.5 transition-colors ${
                direction === value ? "bg-ink font-semibold text-white" : "text-text-secondary hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <TextField
          label="تعداد"
          name="amount"
          type="number"
          min={1}
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="w-28"
        />
        <TextField
          label="دلیل"
          name="reason"
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="مثال: ورود کالای جدید"
          className="min-w-[200px] flex-1"
        />
        <AdminSubmitButton pendingLabel="در حال اعمال...">اعمال</AdminSubmitButton>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[0.76rem] text-text-secondary">
        دلیل سریع:
        {QUICK_REASONS.map((quick) => (
          <button
            key={quick}
            type="button"
            onClick={() => setReason(quick)}
            className="cursor-pointer rounded-full border border-line bg-white px-3 py-1 text-ink transition-colors hover:border-ink/30"
          >
            {quick}
          </button>
        ))}
      </div>
    </form>
  );
}
