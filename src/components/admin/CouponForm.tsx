"use client";

import { useState } from "react";
import { createCouponAction, updateCouponAction } from "@/domains/promotions/admin-actions";
import type { Coupon } from "@/lib/db/schema";
import type { ActionResult } from "@/domains/auth/roles";
import { Card } from "@/components/admin/ui/layout";
import {
  AdminSubmitButton,
  FieldGrid,
  FormActionBar,
  FormAlert,
  SelectField,
  SwitchField,
  TextField,
  useAdminAction,
} from "@/components/admin/ui/form";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const action = coupon ? updateCouponAction : createCouponAction;
  const [state, formAction] = useAdminAction(action, initialState, {
    successMessage: coupon ? "کد تخفیف ذخیره شد" : "کد تخفیف ساخته شد",
    // The create action does not redirect; send the operator back to the
    // list so they see the new code. Edits stay on the page.
    onSuccess: () => {
      if (!coupon) router.push("/admin/coupons");
    },
  });
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(coupon?.discountType ?? "percentage");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {coupon && <input type="hidden" name="id" value={coupon.id} />}
      <FormAlert state={state} />

      <Card title="مقدار تخفیف">
        <div className="flex flex-col gap-4">
          <TextField
            label="کد تخفیف"
            name="code"
            defaultValue={coupon?.code}
            required
            ltr
            placeholder="WELCOME20"
            hint="مشتری این کد را در مرحله پرداخت وارد می‌کند. حروف بزرگ و کوچک فرقی ندارد."
          />
          <FieldGrid>
            <SelectField
              label="نوع تخفیف"
              name="discountType"
              value={discountType}
              onChange={(event) => setDiscountType(event.target.value as "percentage" | "fixed")}
            >
              <option value="percentage">درصدی</option>
              <option value="fixed">مبلغ ثابت</option>
            </SelectField>
            <TextField
              label={discountType === "percentage" ? "درصد تخفیف" : "مبلغ تخفیف"}
              name="discountValue"
              type="number"
              min={1}
              max={discountType === "percentage" ? 100 : undefined}
              suffix={discountType === "percentage" ? "درصد" : "تومان"}
              defaultValue={coupon ? String(coupon.discountValue) : ""}
              required
              hint={discountType === "percentage" ? "عددی از ۱ تا ۱۰۰." : undefined}
            />
          </FieldGrid>
          <TextField
            label="حداقل مبلغ سبد خرید"
            name="minBasketToman"
            type="number"
            min={0}
            suffix="تومان"
            defaultValue={String(coupon?.minBasketToman ?? 0)}
            hint="صفر یعنی بدون حداقل."
          />
        </div>
      </Card>

      <Card title="زمان‌بندی و محدودیت‌ها" description="همه این موارد اختیاری‌اند؛ خالی گذاشتن یعنی «بدون محدودیت».">
        <div className="flex flex-col gap-4">
          <FieldGrid>
            <TextField label="شروع اعتبار" name="startsAt" type="datetime-local" optional defaultValue={toDatetimeLocalValue(coupon?.startsAt ?? null)} />
            <TextField label="پایان اعتبار" name="endsAt" type="datetime-local" optional defaultValue={toDatetimeLocalValue(coupon?.endsAt ?? null)} />
          </FieldGrid>
          <FieldGrid>
            <TextField
              label="سقف کل استفاده"
              name="usageLimit"
              type="number"
              min={1}
              suffix="بار"
              optional
              defaultValue={coupon?.usageLimit ? String(coupon.usageLimit) : ""}
              hint="مجموع دفعاتی که همه مشتریان می‌توانند استفاده کنند."
            />
            <TextField
              label="سقف استفاده هر مشتری"
              name="perCustomerLimit"
              type="number"
              min={1}
              suffix="بار"
              optional
              defaultValue={coupon?.perCustomerLimit ? String(coupon.perCustomerLimit) : ""}
            />
          </FieldGrid>
        </div>
      </Card>

      <SwitchField name="isActive" label="فعال" description="کد غیرفعال در فروشگاه پذیرفته نمی‌شود." defaultChecked={coupon?.isActive ?? true} />

      <FormActionBar>
        <AdminSubmitButton>{coupon ? "ذخیره تغییرات" : "ساخت کد تخفیف"}</AdminSubmitButton>
      </FormActionBar>
    </form>
  );
}
