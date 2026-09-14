"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createCouponAction, updateCouponAction } from "@/domains/promotions/admin-actions";
import type { Coupon } from "@/lib/db/schema";
import type { ActionResult } from "@/domains/auth/roles";

const initialState: ActionResult = { ok: true };

/** `<input type="datetime-local">` wants "YYYY-MM-DDTHH:mm" in local
 * time, not a `Date`'s ISO string (which is UTC and includes seconds/Z)
 * — this only affects the *displayed* default value; the actual
 * submitted string is re-parsed and validated server-side by
 * `couponSchema` regardless. */
function toDatetimeLocalValue(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CouponForm({ coupon }: { coupon?: Coupon }) {
  const action = coupon ? updateCouponAction : createCouponAction;
  const [state, formAction] = useActionState(action, initialState);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(coupon?.discountType ?? "percentage");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {coupon && <input type="hidden" name="id" value={coupon.id} />}

      {!state.ok && (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-red-50 px-4 py-2.5 text-[0.85rem] text-red-700">
          {state.error}
        </p>
      )}

      <FormField label="کد تخفیف" name="code" defaultValue={coupon?.code} required placeholder="مثال: WELCOME20" />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.85rem] text-ink">نوع تخفیف</span>
          <select
            name="discountType"
            value={discountType}
            onChange={(event) => setDiscountType(event.target.value as "percentage" | "fixed")}
            className="w-full rounded-[var(--radius-md)] border border-line bg-white px-4 py-3 text-[0.92rem] text-ink outline-none focus:outline-2 focus:outline-ink"
          >
            <option value="percentage">درصدی</option>
            <option value="fixed">مبلغ ثابت (تومان)</option>
          </select>
        </label>
        <FormField
          label={discountType === "percentage" ? "درصد تخفیف (۱ تا ۱۰۰)" : "مبلغ تخفیف (تومان)"}
          name="discountValue"
          type="number"
          defaultValue={coupon ? String(coupon.discountValue) : ""}
          required
        />
      </div>

      <FormField
        label="حداقل مبلغ سبد خرید (تومان)"
        name="minBasketToman"
        type="number"
        defaultValue={String(coupon?.minBasketToman ?? 0)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="تاریخ شروع (اختیاری)"
          name="startsAt"
          type="datetime-local"
          defaultValue={toDatetimeLocalValue(coupon?.startsAt ?? null)}
        />
        <FormField
          label="تاریخ پایان (اختیاری)"
          name="endsAt"
          type="datetime-local"
          defaultValue={toDatetimeLocalValue(coupon?.endsAt ?? null)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="سقف کل استفاده (اختیاری)"
          name="usageLimit"
          type="number"
          defaultValue={coupon?.usageLimit ? String(coupon.usageLimit) : ""}
        />
        <FormField
          label="سقف استفاده هر مشتری (اختیاری)"
          name="perCustomerLimit"
          type="number"
          defaultValue={coupon?.perCustomerLimit ? String(coupon.perCustomerLimit) : ""}
        />
      </div>

      <label className="flex items-center gap-2 text-[0.88rem] text-ink">
        <input type="checkbox" name="isActive" defaultChecked={coupon?.isActive ?? true} className="h-4 w-4" />
        فعال
      </label>

      <SubmitButton pendingLabel="در حال ذخیره...">{coupon ? "ذخیره تغییرات" : "ایجاد کد تخفیف"}</SubmitButton>
    </form>
  );
}
