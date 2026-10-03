"use client";

import { useState } from "react";
import { FormField, type FormFieldProps } from "@/components/ui/FormField";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";

type PasswordFieldProps = Omit<FormFieldProps, "type" | "endAdornment" | "dir">;

/**
 * Password input with a show/hide toggle. Only toggles the input `type`
 * in the browser — nothing about the value is stored or sent elsewhere.
 * `dir="ltr"` keeps typed latin characters/symbols in a stable order.
 */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField
      {...props}
      type={visible ? "text" : "password"}
      dir="ltr"
      endAdornment={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
          aria-pressed={visible}
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-text-secondary transition-colors hover:bg-ink/5 hover:text-ink"
        >
          {visible ? <EyeOffIcon width={19} height={19} /> : <EyeIcon width={19} height={19} />}
        </button>
      }
    />
  );
}
