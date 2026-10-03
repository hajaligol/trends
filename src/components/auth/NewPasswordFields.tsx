"use client";

import { useEffect, useRef, useState } from "react";
import { PasswordField } from "@/components/auth/PasswordField";
import { CheckIcon } from "@/components/ui/icons";

type Props = {
  passwordError?: string;
  confirmError?: string;
  passwordLabel?: string;
  confirmLabel?: string;
};

const MIN_LENGTH = 8; // mirrors passwordSchema (src/lib/validation/auth.ts)

function evaluate(password: string) {
  const longEnough = password.length >= MIN_LENGTH;
  const mixed = /[A-Za-z\u0600-\u06FF]/.test(password) && /[0-9\u06F0-\u06F9]/.test(password);
  const extra = password.length >= 12 || /[^A-Za-z0-9\u0600-\u06FF\u06F0-\u06F9\s]/.test(password);
  // Score drives only the advisory meter. The server remains the sole
  // authority (min 8 chars); the meter never blocks submission.
  const score = password.length === 0 ? 0 : !longEnough ? 1 : 1 + Number(mixed) + Number(extra);
  return { longEnough, mixed, score };
}

const LEVELS = [
  { label: "", bar: "bg-ink/10" },
  { label: "ضعیف", bar: "bg-red-400" },
  { label: "متوسط", bar: "bg-yellow" },
  { label: "قوی", bar: "bg-aqua" },
] as const;

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? "text-ink" : "text-text-secondary"}`}>
      <span
        aria-hidden="true"
        className={`grid h-4 w-4 place-items-center rounded-full ${ok ? "bg-aqua text-ink" : "bg-ink/8"}`}
      >
        {ok ? <CheckIcon width={11} height={11} strokeWidth={2.4} /> : null}
      </span>
      {children}
      <span className="sr-only">{ok ? " (برقرار است)" : " (برقرار نیست)"}</span>
    </li>
  );
}

/**
 * Password + confirmation pair with live, advisory feedback. Uncontrolled
 * inputs (so the Server Action still receives plain FormData); we only
 * mirror the values locally for the meter, and clear the mirror when
 * React resets the form after a submission (passwords are never echoed
 * back from the server).
 */
export function NewPasswordFields({
  passwordError,
  confirmError,
  passwordLabel = "رمز عبور",
  confirmLabel = "تکرار رمز عبور",
}: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const anchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;
    const onReset = () => {
      setPassword("");
      setConfirm("");
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const { longEnough, mixed, score } = evaluate(password);
  const level = LEVELS[score] ?? LEVELS[0];
  const showMatch = confirm.length > 0;
  const matches = confirm === password;

  return (
    <div ref={anchor} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <PasswordField
          label={passwordLabel}
          name="password"
          autoComplete="new-password"
          required
          error={passwordError}
          inputProps={{ onChange: (e) => setPassword(e.target.value) }}
        />
        {password.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] bg-benefit-bg px-3.5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex flex-1 gap-1.5" aria-hidden="true">
                {[1, 2, 3].map((segment) => (
                  <span
                    key={segment}
                    className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                      score >= segment ? level.bar : "bg-ink/10"
                    }`}
                  />
                ))}
              </div>
              <span className="min-w-10 text-[0.78rem] font-semibold text-ink" aria-live="polite">
                {level.label}
              </span>
            </div>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[0.78rem]">
              <Rule ok={longEnough}>حداقل ۸ کاراکتر</Rule>
              <Rule ok={mixed}>ترکیب حروف و عدد (پیشنهادی)</Rule>
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <PasswordField
          label={confirmLabel}
          name="confirmPassword"
          autoComplete="new-password"
          required
          error={confirmError}
          inputProps={{ onChange: (e) => setConfirm(e.target.value) }}
        />
        {showMatch && !confirmError ? (
          <p
            aria-live="polite"
            className={`flex items-center gap-1.5 text-[0.78rem] ${matches ? "text-ink" : "text-text-secondary"}`}
          >
            {matches ? (
              <>
                <CheckIcon width={14} height={14} strokeWidth={2.4} className="rounded-full bg-aqua p-0.5" />
                رمز عبور و تکرار آن یکسان است
              </>
            ) : (
              "رمز عبور و تکرار آن هنوز یکسان نیست"
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}
