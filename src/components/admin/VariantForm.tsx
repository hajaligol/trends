"use client";

import { useActionState } from "react";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createVariantAction, updateVariantAction } from "@/domains/catalog/admin-actions";
import type { ProductVariant } from "@/lib/db/schema";
import type { ActionResult } from "@/domains/auth/roles";

const initialState: ActionResult = { ok: true };

export function VariantForm({
  productId,
  variant,
  onDone,
}: {
  productId: string;
  variant?: ProductVariant;
  onDone?: () => void;
}) {
  const action = variant ? updateVariantAction : createVariantAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onDone?.();
      }}
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-line bg-header p-4"
    >
      <input type="hidden" name="productId" value={productId} />
      {variant && <input type="hidden" name="id" value={variant.id} />}

      {!state.ok && (
        <p role="alert" className="text-[0.8rem] text-red-700">
          {state.error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="SKU" name="sku" defaultValue={variant?.sku} required />
        <FormField label="سایز" name="size" defaultValue={variant?.size} required />
        <FormField label="رنگ" name="color" defaultValue={variant?.color} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="کد رنگ (اختیاری، مثال #AAD0E2)" name="colorHex" defaultValue={variant?.colorHex ?? ""} />
        <FormField label="جنس (اختیاری)" name="material" defaultValue={variant?.material ?? ""} />
        <div />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <FormField label="قیمت (تومان)" name="priceToman" type="number" defaultValue={String(variant?.priceToman ?? "")} required />
        <FormField
          label="قیمت قبل از تخفیف (اختیاری)"
          name="compareAtPriceToman"
          type="number"
          defaultValue={variant?.compareAtPriceToman ? String(variant.compareAtPriceToman) : ""}
        />
        <FormField label="موجودی" name="stock" type="number" defaultValue={String(variant?.stock ?? 0)} required />
        <FormField
          label="آستانه کمبود موجودی"
          name="lowStockThreshold"
          type="number"
          defaultValue={String(variant?.lowStockThreshold ?? 5)}
        />
      </div>

      <label className="flex items-center gap-2 text-[0.85rem] text-ink">
        <input type="checkbox" name="isActive" defaultChecked={variant?.isActive ?? true} className="h-4 w-4" />
        فعال
      </label>

      <SubmitButton pendingLabel="در حال ذخیره...">{variant ? "ذخیره نوع محصول" : "افزودن نوع محصول"}</SubmitButton>
    </form>
  );
}
