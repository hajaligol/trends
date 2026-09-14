"use client";

import { useActionState } from "react";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { updateSiteSettingsAction } from "@/domains/admin/settings-actions";
import type { SiteSettings } from "@/lib/db/schema";
import type { ActionResult } from "@/domains/auth/roles";

const initialState: ActionResult = { ok: true };

export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, formAction] = useActionState(updateSiteSettingsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-white p-5">
      {!state.ok && (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-red-50 px-4 py-2.5 text-[0.85rem] text-red-700">
          {state.error}
        </p>
      )}

      <FormField label="نام فروشگاه" name="storeName" defaultValue={settings.storeName} required />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="ایمیل پشتیبانی (اختیاری)" name="supportEmail" type="email" defaultValue={settings.supportEmail ?? ""} />
        <FormField label="تلفن پشتیبانی (اختیاری)" name="supportPhone" defaultValue={settings.supportPhone ?? ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          label="هزینه ارسال استاندارد (تومان)"
          name="standardShippingFeeToman"
          type="number"
          defaultValue={String(settings.standardShippingFeeToman)}
          required
        />
        <FormField
          label="هزینه ارسال اکسپرس (تومان)"
          name="expressShippingFeeToman"
          type="number"
          defaultValue={String(settings.expressShippingFeeToman)}
          required
        />
        <FormField
          label="آستانه ارسال رایگان (تومان)"
          name="freeShippingThresholdToman"
          type="number"
          defaultValue={String(settings.freeShippingThresholdToman)}
          required
        />
      </div>

      <SubmitButton pendingLabel="در حال ذخیره...">ذخیره تنظیمات</SubmitButton>
    </form>
  );
}
