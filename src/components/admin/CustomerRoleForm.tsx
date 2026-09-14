"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { updateCustomerRoleAction } from "@/domains/customers/actions";
import type { ActionResult } from "@/domains/auth/roles";

const initialState: ActionResult = { ok: true };

const ROLE_OPTIONS: { value: "customer" | "staff" | "admin"; label: string }[] = [
  { value: "customer", label: "مشتری" },
  { value: "staff", label: "کارمند" },
  { value: "admin", label: "مدیر کل" },
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
  const [state, formAction] = useActionState(updateCustomerRoleAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />

      {!state.ok && (
        <p role="alert" className="text-[0.8rem] text-red-700">
          {state.error}
        </p>
      )}
      {isSelf && <p className="text-[0.78rem] text-text-secondary">شما نمی‌توانید نقش خودتان را کاهش دهید.</p>}

      <select
        name="role"
        defaultValue={currentRole}
        className="w-full rounded-[var(--radius-md)] border border-line bg-white px-4 py-3 text-[0.92rem] text-ink outline-none focus:outline-2 focus:outline-ink"
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <SubmitButton pendingLabel="در حال ذخیره...">ذخیره نقش</SubmitButton>
    </form>
  );
}
