"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { adjustStockAction } from "@/domains/inventory/actions";
import type { ActionResult } from "@/domains/auth/roles";

const initialState: ActionResult = { ok: true };

export function StockAdjustForm({ variantId }: { variantId: string }) {
  const [state, formAction] = useActionState(adjustStockAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="variantId" value={variantId} />
      <label className="flex flex-col gap-1 text-[0.8rem]">
        <span className="text-text-secondary">تغییر (+/-)</span>
        <input
          type="number"
          name="delta"
          required
          className="w-24 rounded-[var(--radius-sm)] border border-line px-3 py-2 outline-none focus:border-ink"
        />
      </label>
      <label className="flex flex-col gap-1 text-[0.8rem]">
        <span className="text-text-secondary">دلیل</span>
        <input
          type="text"
          name="reason"
          required
          placeholder="مثال: ورود کالای جدید"
          className="w-44 rounded-[var(--radius-sm)] border border-line px-3 py-2 outline-none focus:border-ink"
        />
      </label>
      <SubmitButton pendingLabel="در حال اعمال...">اعمال</SubmitButton>
      {!state.ok && (
        <p role="alert" className="w-full text-[0.78rem] text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
