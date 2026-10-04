"use client";

import { createVariantAction, updateVariantAction } from "@/domains/catalog/admin-actions";
import type { ProductVariant } from "@/lib/db/schema";
import type { ActionResult } from "@/domains/auth/roles";
import { adminButton } from "@/components/admin/ui/layout";
import { AdminSubmitButton, FieldGrid, FormAlert, SwitchField, TextField, useAdminAction } from "@/components/admin/ui/form";

const initialState: ActionResult = { ok: true };

export function VariantForm({
  productId,
  variant,
  onDone,
  onCancel,
}: {
  productId: string;
  variant?: ProductVariant;
  /** Called only after the server accepted the change. */
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const action = variant ? updateVariantAction : createVariantAction;
  const [state, formAction] = useAdminAction(action, initialState, {
    successMessage: variant ? "نوع محصول ذخیره شد" : "نوع محصول اضافه شد",
    onSuccess: () => onDone?.(),
  });

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded-[var(--radius-md)] border border-line bg-bg p-4 sm:p-5">
      <input type="hidden" name="productId" value={productId} />
      {variant && <input type="hidden" name="id" value={variant.id} />}
      <FormAlert state={state} />

      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
        <legend className="mb-3 p-0 text-[0.84rem] font-bold text-ink">مشخصات</legend>
        <FieldGrid columns={3}>
          <TextField label="کد کالا (SKU)" name="sku" defaultValue={variant?.sku} required ltr placeholder="SHIRT-M-BLUE" hint="باید در کل فروشگاه یکتا باشد." />
          <TextField label="سایز" name="size" defaultValue={variant?.size} required placeholder="M" />
          <TextField label="رنگ" name="color" defaultValue={variant?.color} required placeholder="آبی" />
        </FieldGrid>
        <FieldGrid columns={3}>
          <TextField label="کد رنگ" name="colorHex" defaultValue={variant?.colorHex ?? ""} optional ltr placeholder="#AAD0E2" hint="برای نمایش دایره رنگی در فروشگاه." />
          <TextField label="جنس" name="material" defaultValue={variant?.material ?? ""} optional placeholder="پنبه" />
        </FieldGrid>
      </fieldset>

      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
        <legend className="mb-3 p-0 text-[0.84rem] font-bold text-ink">قیمت و موجودی</legend>
        <FieldGrid columns={4}>
          <TextField label="قیمت فروش" name="priceToman" type="number" min={0} suffix="تومان" defaultValue={String(variant?.priceToman ?? "")} required />
          <TextField
            label="قیمت قبل از تخفیف"
            name="compareAtPriceToman"
            type="number"
            min={0}
            suffix="تومان"
            optional
            defaultValue={variant?.compareAtPriceToman ? String(variant.compareAtPriceToman) : ""}
            hint="اگر بیشتر از قیمت فروش باشد، درصد تخفیف نمایش داده می‌شود."
          />
          <TextField label="موجودی" name="stock" type="number" min={0} suffix="عدد" defaultValue={String(variant?.stock ?? 0)} required />
          <TextField
            label="آستانه کمبود"
            name="lowStockThreshold"
            type="number"
            min={0}
            suffix="عدد"
            defaultValue={String(variant?.lowStockThreshold ?? 5)}
            hint="زیر این عدد، «رو به اتمام» حساب می‌شود."
          />
        </FieldGrid>
      </fieldset>

      <SwitchField name="isActive" label="فعال" description="نوع غیرفعال در فروشگاه قابل خرید نیست." defaultChecked={variant?.isActive ?? true} />

      <div className="flex flex-wrap items-center gap-2.5">
        <AdminSubmitButton>{variant ? "ذخیره نوع محصول" : "افزودن نوع محصول"}</AdminSubmitButton>
        {onCancel && (
          <button type="button" onClick={onCancel} className={adminButton("ghost", "md")}>
            انصراف
          </button>
        )}
      </div>
    </form>
  );
}
