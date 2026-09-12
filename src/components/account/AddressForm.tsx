"use client";

import { useActionState } from "react";
import type { Address } from "@/lib/db/schema";
import { createAddressAction, updateAddressAction } from "@/domains/addresses/actions";
import type { ActionResult } from "@/domains/auth/actions";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initialState: ActionResult = undefined;

export function AddressForm({ address, onDone }: { address?: Address; onDone?: () => void }) {
  const action = address ? updateAddressAction.bind(null, address.id) : createAddressAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onDone?.();
      }}
      className="flex flex-col gap-4"
    >
      {state?.error ? (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-red-50 px-4 py-2.5 text-[0.85rem] text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="نام گیرنده"
          name="recipientName"
          defaultValue={address?.recipientName}
          required
          error={state?.fieldErrors?.recipientName}
        />
        <FormField
          label="موبایل گیرنده"
          name="recipientMobile"
          type="tel"
          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
          defaultValue={address?.recipientMobile}
          required
          error={state?.fieldErrors?.recipientMobile}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="استان"
          name="province"
          defaultValue={address?.province}
          required
          error={state?.fieldErrors?.province}
        />
        <FormField
          label="شهر"
          name="city"
          defaultValue={address?.city}
          required
          error={state?.fieldErrors?.city}
        />
      </div>

      <FormField
        label="آدرس کامل"
        name="addressLine"
        defaultValue={address?.addressLine}
        required
        error={state?.fieldErrors?.addressLine}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="کد پستی"
          name="postalCode"
          defaultValue={address?.postalCode ?? ""}
          placeholder="۱۰ رقم"
          required
          error={state?.fieldErrors?.postalCode}
        />
        <FormField
          label="پلاک / واحد (اختیاری)"
          name="plaqueUnitDetails"
          defaultValue={address?.plaqueUnitDetails ?? ""}
          error={state?.fieldErrors?.plaqueUnitDetails}
        />
      </div>

      <FormField
        label="توضیحات تحویل (اختیاری)"
        name="deliveryNotes"
        defaultValue={address?.deliveryNotes ?? ""}
        error={state?.fieldErrors?.deliveryNotes}
      />

      <label className="flex items-center gap-2 text-[0.88rem] text-ink">
        <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="h-4 w-4" />
        آدرس پیش‌فرض من
      </label>

      <SubmitButton pendingLabel="در حال ذخیره...">{address ? "ذخیره تغییرات" : "افزودن آدرس"}</SubmitButton>
    </form>
  );
}
