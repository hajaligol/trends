"use client";

import { updateCustomerRoleAction } from "@/domains/customers/actions";
import type { ActionResult } from "@/domains/auth/roles";
import { AdminSubmitButton, FormAlert, SelectField, useAdminAction } from "@/components/admin/ui/form";

const initialState: ActionResult = { ok: true };

const ROLE_OPTIONS: { value: "customer" | "staff" | "admin"; label: string }[] = [
  { value: "customer", label: "مشتری — فقط خرید" },
  { value: "staff", label: "کارمند — دسترسی به پنل مدیریت" },
  { value: "admin", label: "مدیر کل — دسترسی کامل و تغییر نقش‌ها" },
];

export function CustomerRoleForm({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string;
  currentRole: string;
  isSelf: boolean;
}) {
  const [state, formAction] = useAdminAction(updateCustomerRoleAction, initialState, {
    successMessage: "نقش کاربر ذخیره شد",
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <FormAlert state={state} />
      <SelectField
        label="نقش کاربر"
        name="role"
        defaultValue={currentRole}
        hint={isSelf ? "شما نمی‌توانید نقش خودتان را کاهش دهید." : "کارمند و مدیر کل می‌توانند وارد پنل مدیریت شوند."}
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <AdminSubmitButton className="w-fit">ذخیره نقش</AdminSubmitButton>
    </form>
  );
}
