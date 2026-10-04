"use client";

import { updateSiteSettingsAction } from "@/domains/admin/settings-actions";
import type { SiteSettings } from "@/lib/db/schema";
import type { ActionResult } from "@/domains/auth/roles";
import { Card } from "@/components/admin/ui/layout";
import { AdminSubmitButton, FieldGrid, FormActionBar, FormAlert, TextField, useAdminAction } from "@/components/admin/ui/form";

const initialState: ActionResult = { ok: true };

export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, formAction] = useAdminAction(updateSiteSettingsAction, initialState, {
    successMessage: "تنظیمات ذخیره شد",
  });

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormAlert state={state} />

      <Card title="اطلاعات فروشگاه">
        <div className="flex flex-col gap-4">
          <TextField label="نام فروشگاه" name="storeName" defaultValue={settings.storeName} required />
          <FieldGrid>
            <TextField label="ایمیل پشتیبانی" name="supportEmail" type="email" defaultValue={settings.supportEmail ?? ""} optional ltr />
            <TextField label="تلفن پشتیبانی" name="supportPhone" defaultValue={settings.supportPhone ?? ""} optional ltr />
          </FieldGrid>
        </div>
      </Card>

      <Card title="هزینه ارسال" description="این مبالغ در مرحله پرداخت برای مشتری محاسبه می‌شود. سفارش‌هایی که بالاتر از آستانه باشند، ارسال رایگان دارند.">
        <FieldGrid columns={3}>
          <TextField label="ارسال استاندارد" name="standardShippingFeeToman" type="number" min={0} suffix="تومان" defaultValue={String(settings.standardShippingFeeToman)} required />
          <TextField label="ارسال اکسپرس" name="expressShippingFeeToman" type="number" min={0} suffix="تومان" defaultValue={String(settings.expressShippingFeeToman)} required />
          <TextField
            label="آستانه ارسال رایگان"
            name="freeShippingThresholdToman"
            type="number"
            min={0}
            suffix="تومان"
            defaultValue={String(settings.freeShippingThresholdToman)}
            required
            hint="صفر یعنی ارسال رایگان خاموش است."
          />
        </FieldGrid>
      </Card>

      <FormActionBar>
        <AdminSubmitButton>ذخیره تنظیمات</AdminSubmitButton>
      </FormActionBar>
    </form>
  );
}
