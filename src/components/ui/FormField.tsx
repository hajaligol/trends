import type { ReactNode } from "react";
import { AlertCircleIcon } from "@/components/ui/icons";

export type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  /** Helper text shown under the input while there is no error. */
  hint?: string;
  /** Extra element on the label row's far side (e.g. "forgot password?"). */
  labelAction?: ReactNode;
  /** Element rendered inside the input's end edge (e.g. show/hide toggle). */
  endAdornment?: ReactNode;
  /** `ltr` for numeric/latin data (mobile, email) inside the RTL page. */
  dir?: "ltr" | "rtl";
  inputMode?: "text" | "tel" | "email" | "numeric";
  autoFocus?: boolean;
  /** Extra attributes for the <input>, e.g. onChange for live feedback. */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

/**
 * One labeled input + inline error message, shared by every auth/address
 * form so validation errors render consistently (rule "Use reusable
 * components. Do not duplicate large JSX blocks.").
 *
 * All new props are optional, so existing callers (admin, address,
 * contact forms) render exactly as before.
 */
export function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  autoComplete,
  error,
  hint,
  labelAction,
  endAdornment,
  dir,
  inputMode,
  autoFocus,
  inputProps,
}: FormFieldProps) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={name} className="text-[0.85rem] font-medium text-ink">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          inputMode={inputMode}
          dir={dir}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...inputProps}
          className={`w-full rounded-[var(--radius-md)] border bg-white px-4 py-3 text-[0.92rem] text-ink outline-none transition-colors placeholder:text-text-secondary/60 hover:border-ink/25 focus:border-brand focus:outline-2 focus:outline-offset-2 focus:outline-brand/40 ${
            dir === "ltr" ? "text-end placeholder:text-end" : ""
          } ${endAdornment ? "pe-12" : ""} ${error ? "border-red-400" : "border-line"}`}
        />
        {endAdornment ? (
          <div className="absolute inset-y-0 end-1.5 flex items-center">{endAdornment}</div>
        ) : null}
      </div>
      {error ? (
        <p id={`${name}-error`} className="flex items-start gap-1.5 text-[0.78rem] text-red-600">
          <AlertCircleIcon width={15} height={15} className="mt-px shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="text-[0.78rem] text-text-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
