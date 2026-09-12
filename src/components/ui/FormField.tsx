type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  error?: string;
};

/**
 * One labeled input + inline error message, shared by every auth/address
 * form so validation errors render consistently (rule "Use reusable
 * components. Do not duplicate large JSX blocks.").
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
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-[0.85rem] text-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`w-full rounded-[var(--radius-md)] border bg-white px-4 py-3 text-[0.92rem] text-ink outline-none transition-colors focus:outline-2 focus:outline-ink focus:outline-offset-2 ${
          error ? "border-red-400" : "border-line"
        }`}
      />
      {error ? (
        <p id={`${name}-error`} className="text-[0.78rem] text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
