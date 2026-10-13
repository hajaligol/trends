"use client";

import { ImagePicker } from "@/components/admin/ImagePicker";
import { createBrandAction, updateBrandAction } from "@/domains/brands/actions";
import type { AdminBrandRow } from "@/domains/brands/queries";
import type { ActionResult } from "@/domains/auth/roles";
import { adminButton } from "@/components/admin/ui/layout";
import {
  AdminSubmitButton,
  FieldGrid,
  FormAlert,
  SwitchField,
  TextareaField,
  TextField,
  useAdminAction,
} from "@/components/admin/ui/form";

const initialState: ActionResult = { ok: true };

export function BrandForm({
  brand,
  onDone,
  onCancel,
}: {
  brand?: AdminBrandRow;
  /** Called only after the server accepted the change. */
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const action = brand ? updateBrandAction : createBrandAction;
  const [state, formAction] = useAdminAction(action, initialState, {
    successMessage: brand ? "برند ذخیره شد" : "برند اضافه شد",
    onSuccess: () => onDone?.(),
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {brand && <input type="hidden" name="id" value={brand.id} />}
      <FormAlert state={state} />

      <FieldGrid>
        <TextField label="نام برند" name="name" defaultValue={brand?.name} required placeholder="مثال: نایک" />
        <TextField
          label="نام لاتین"
          name="nameEn"
          defaultValue={brand?.nameEn ?? ""}
          optional
          ltr
          placeholder="Nike"
          hint="در جستجوی فروشگاه هم استفاده می‌شود."
        />
      </FieldGrid>

      <FieldGrid>
        <TextField label="کشور سازنده" name="countryOfOrigin" defaultValue={brand?.countryOfOrigin ?? ""} optional placeholder="ایران" hint="در جدول مشخصات محصول نمایش داده می‌شود." />
        <TextField label="ترتیب نمایش" name="displayOrder" type="number" defaultValue={String(brand?.displayOrder ?? 0)} hint="عدد کوچک‌تر، زودتر." />
      </FieldGrid>

      {brand && (
        <TextField
          label="نامک"
          name="slug"
          defaultValue={brand.slug}
          hint="شناسه‌ی یکتای برند؛ با تغییر نام برند عوض نمی‌شود. حروف فارسی یا انگلیسی کوچک، عدد و خط تیره."
        />
      )}

      <TextareaField label="توضیحات" name="description" defaultValue={brand?.description ?? ""} optional rows={3} />

      <ImagePicker
        name="logoUrl"
        folder="brands"
        label="لوگوی برند (اختیاری)"
        defaultValue={brand?.logoUrl}
        hint="ترجیحاً تصویر مربعی یا افقی با پس‌زمینه شفاف."
      />

      <SwitchField
        name="isActive"
        label="فعال"
        description="برند غیرفعال در فرم محصول انتخاب نمی‌شود و در فروشگاه نمایش داده نمی‌شود؛ محصولاتش همچنان فروخته می‌شوند."
        defaultChecked={brand?.isActive ?? true}
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <AdminSubmitButton>{brand ? "ذخیره تغییرات" : "افزودن برند"}</AdminSubmitButton>
        {onCancel && (
          <button type="button" onClick={onCancel} className={adminButton("ghost", "md")}>
            انصراف
          </button>
        )}
      </div>
    </form>
  );
}
