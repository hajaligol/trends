"use client";

import { useActionState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/feedback/ToastProvider";
import { ADMIN_CONTROL, adminButton } from "@/components/admin/ui/layout";
import { AlertTriangleIcon } from "@/components/admin/ui/icons";

/* ------------------------------------------------------------------ */
/* Action hook                                                         */
/* ------------------------------------------------------------------ */

type ResultLike = { ok: boolean };

/**
 * `useActionState` for admin Server Actions, plus the feedback the old forms
 * were missing: a toast when the action succeeds (most forms used to save
 * silently), and an `onSuccess` hook that fires **only** on success — the
 * previous inline forms closed themselves even when the action returned an
 * error, which hid the error message.
 *
 * Authorization/validation still happen entirely inside the Server Action;
 * this only decides what the operator sees afterwards.
 */
export function useAdminAction<State extends ResultLike>(
  action: (previous: State, formData: FormData) => Promise<State>,
  initialState: State,
  options: { successMessage?: string; onSuccess?: (result: State) => void } = {},
) {
  const { showToast } = useToast();
  return useActionState<State, FormData>(async (previous, formData) => {
    const next = await action(previous as State, formData);
    if (next.ok) {
      if (options.successMessage) showToast(options.successMessage);
      options.onSuccess?.(next);
    }
    return next;
  }, initialState as Awaited<State>);
}

/* ------------------------------------------------------------------ */
/* Feedback + buttons                                                  */
/* ------------------------------------------------------------------ */

/** Inline error banner for a failed action (renders nothing on success). */
export function FormAlert({ state }: { state: ResultLike }) {
  if (state.ok) return null;
  const message = (state as { error?: string }).error;
  return (
    <p
      role="alert"
      className="m-0 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-[0.86rem] leading-6 text-red-800"
    >
      <AlertTriangleIcon width={18} height={18} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-e-transparent ${className}`}
    />
  );
}

export function AdminSubmitButton({
  children,
  pendingLabel = "در حال ذخیره...",
  variant = "primary",
  className = "",
  size = "md",
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "brand" | "secondary" | "danger";
  className?: string;
  size?: "sm" | "md";
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={adminButton(variant, size, className)}>
      {pending && <Spinner />}
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Sticky save bar for long edit forms, so Save is always in reach. */
export function FormActionBar({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-line bg-white/95 px-4 py-3 shadow-[0_10px_30px_-12px_rgba(24,38,48,0.28)] backdrop-blur sm:px-5">
      <p className="m-0 text-[0.8rem] text-text-secondary">{hint ?? "تغییرات پس از زدن «ذخیره» اعمال می‌شود."}</p>
      <div className="flex items-center gap-2.5">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fields                                                              */
/* ------------------------------------------------------------------ */

function FieldShell({
  label,
  htmlFor,
  hint,
  optional,
  required,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  optional?: boolean;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="flex items-center gap-2 text-[0.84rem] font-medium text-ink">
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-600">
            *
          </span>
        )}
        {optional && <span className="text-[0.72rem] font-normal text-text-secondary">اختیاری</span>}
      </label>
      {children}
      {hint && (
        <p id={`${htmlFor}-hint`} className="m-0 text-[0.76rem] leading-5 text-text-secondary">
          {hint}
        </p>
      )}
    </div>
  );
}

type CommonFieldProps = { label: string; name: string; hint?: string; optional?: boolean; className?: string };

export function TextField({
  label,
  name,
  hint,
  optional,
  className,
  suffix,
  ltr,
  required,
  ...input
}: CommonFieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "className"> & {
    /** Unit shown inside the input's end edge, e.g. «تومان». */
    suffix?: string;
    /** LTR content (codes, URLs, SKUs, numbers) inside the RTL page. */
    ltr?: boolean;
  }) {
  const isNumber = input.type === "number";
  return (
    <FieldShell label={label} htmlFor={name} hint={hint} optional={optional} required={required} className={className}>
      <div className="relative">
        <input
          id={name}
          name={name}
          required={required}
          aria-describedby={hint ? `${name}-hint` : undefined}
          dir={ltr || isNumber ? "ltr" : undefined}
          {...input}
          className={`${ADMIN_CONTROL} ${ltr || isNumber ? "text-end" : ""} ${suffix ? "pe-16" : ""} ${
            isNumber ? "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" : ""
          }`}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-[0.76rem] text-text-secondary">{suffix}</span>
        )}
      </div>
    </FieldShell>
  );
}

export function SelectField({
  label,
  name,
  hint,
  optional,
  className,
  required,
  children,
  ...select
}: CommonFieldProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, "name" | "className">) {
  return (
    <FieldShell label={label} htmlFor={name} hint={hint} optional={optional} required={required} className={className}>
      <select id={name} name={name} required={required} aria-describedby={hint ? `${name}-hint` : undefined} {...select} className={ADMIN_CONTROL}>
        {children}
      </select>
    </FieldShell>
  );
}

export function TextareaField({
  label,
  name,
  hint,
  optional,
  className,
  required,
  ...textarea
}: CommonFieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "className">) {
  return (
    <FieldShell label={label} htmlFor={name} hint={hint} optional={optional} required={required} className={className}>
      <textarea
        id={name}
        name={name}
        required={required}
        rows={textarea.rows ?? 4}
        aria-describedby={hint ? `${name}-hint` : undefined}
        {...textarea}
        className={`${ADMIN_CONTROL} leading-7`}
      />
    </FieldShell>
  );
}

/**
 * Checkbox presented as a switch card (still a real form checkbox, so it
 * submits exactly like the plain `<input type="checkbox">` it replaces).
 */
export function SwitchField({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-[var(--radius-md)] border border-line bg-white p-4 transition-colors hover:border-ink/25 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand/50">
      <span className="flex flex-col gap-0.5">
        <span className="text-[0.88rem] font-medium text-ink">{label}</span>
        {description && <span className="text-[0.78rem] leading-5 text-text-secondary">{description}</span>}
      </span>
      <input type="checkbox" role="switch" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-ink/20 transition-colors after:absolute after:start-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-brand peer-checked:after:ltr:translate-x-5 peer-checked:after:rtl:-translate-x-5"
      />
    </label>
  );
}

/** Two- or three-column responsive field grid. */
export function FieldGrid({ columns = 2, children }: { columns?: 2 | 3 | 4; children: ReactNode }) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];
  return <div className={`grid gap-4 ${cols}`}>{children}</div>;
}
