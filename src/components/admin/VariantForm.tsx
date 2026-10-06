"use client";

import { useState } from "react";
import { updateVariantAction } from "@/domains/catalog/admin-actions";
import type { ProductVariant } from "@/lib/db/schema";
import type { ActionResult } from "@/domains/auth/roles";
import { findPaletteColor, KEEP_CURRENT_COLOR } from "@/domains/catalog/color-palette";
import { ColorPalettePicker } from "@/components/admin/ColorPalettePicker";
import { adminButton } from "@/components/admin/ui/layout";
import { AdminSubmitButton, FieldGrid, FormAlert, SwitchField, TextField, useAdminAction } from "@/components/admin/ui/form";

const initialState: ActionResult = { ok: true };

/**
 * Edits ONE existing variant. (New variants are created in bulk — see
 * `VariantMatrixBuilder`.) The SKU is shown but not editable: it is
 * generated from the product code when the variant is created.
 */
export function VariantForm({
  productId,
  variant,
  onDone,
  onCancel,
}: {
  productId: string;
  variant: ProductVariant;
  /** Called only after the server accepted the change. */
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction] = useAdminAction(updateVariantAction, initialState, {
    successMessage: "نوع محصول ذخیره شد",
    onSuccess: () => onDone?.(),
  });

  // A colour that's in the palette is preselected; an older, off-palette one
  // is offered as «(فعلی)» so saving other fields doesn't change it.
  const paletteMatch = findPaletteColor({ name: variant.color, hex: variant.colorHex });
  const [colorCodes, setColorCodes] = useState<string[]>([paletteMatch?.code ?? KEEP_CURRENT_COLOR]);

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded-[var(--radius-md)] border border-line bg-bg p-4 sm:p-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="id" value={variant.id} />
      <input type="hidden" name="colorCode" value={colorCodes[0] ?? ""} />
      <FormAlert state={state} />

      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
        <legend className="mb-3 p-0 text-[0.84rem] font-bold text-ink">مشخصات</legend>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.84rem]">
          <span className="text-text-secondary">کد کالا (SKU)</span>
          <span dir="ltr" className="font-bold text-ink">
            {variant.sku}
          </span>
          <span className="text-[0.76rem] text-text-secondary">(خودکار؛ قابل ویرایش نیست)</span>
        </div>
        <FieldGrid columns={3}>
          <TextField label="سایز" name="size" defaultValue={variant.size} required placeholder="M" />
          <ColorPalettePicker
            label="رنگ"
            multiple={false}
            required
            selected={colorCodes}
            onChange={setColorCodes}
            legacy={paletteMatch ? undefined : { name: variant.color, hex: variant.colorHex }}
          />
          <TextField label="جنس" name="material" defaultValue={variant.material ?? ""} optional placeholder="پنبه" />
        </FieldGrid>
      </fieldset>

      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
        <legend className="mb-3 p-0 text-[0.84rem] font-bold text-ink">قیمت و موجودی</legend>
        <FieldGrid columns={4}>
          <TextField label="قیمت فروش" name="priceToman" type="number" min={0} suffix="تومان" defaultValue={String(variant.priceToman)} required />
          <TextField
            label="قیمت قبل از تخفیف"
            name="compareAtPriceToman"
            type="number"
            min={0}
            suffix="تومان"
            optional
            defaultValue={variant.compareAtPriceToman ? String(variant.compareAtPriceToman) : ""}
            hint="اگر بیشتر از قیمت فروش باشد، درصد تخفیف نمایش داده می‌شود."
          />
          <TextField label="موجودی" name="stock" type="number" min={0} suffix="عدد" defaultValue={String(variant.stock)} required />
          <TextField
            label="آستانه کمبود"
            name="lowStockThreshold"
            type="number"
            min={0}
            suffix="عدد"
            defaultValue={String(variant.lowStockThreshold)}
            hint="زیر این عدد، «رو به اتمام» حساب می‌شود."
          />
        </FieldGrid>
      </fieldset>

      <SwitchField name="isActive" label="فعال" description="نوع غیرفعال در فروشگاه قابل خرید نیست." defaultChecked={variant.isActive} />

      <div className="flex flex-wrap items-center gap-2.5">
        <AdminSubmitButton>ذخیره نوع محصول</AdminSubmitButton>
        {onCancel && (
          <button type="button" onClick={onCancel} className={adminButton("ghost", "md")}>
            انصراف
          </button>
        )}
      </div>
    </form>
  );
}
