"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/feedback/ToastProvider";

type Result = { ok: true } | { ok: false; error: string };

/**
 * One-click on/off switch for list rows (coupon active, subscriber status,
 * support message resolved…). The thumb moves immediately (optimistic), the
 * Server Action runs, and on failure the switch snaps back and the server's
 * error is shown. Replaces the old text pills whose wording («فعال» /
 * «غیرفعال») did not make it obvious they were clickable.
 */
export function ToggleSwitch({
  checked,
  action,
  label,
  onLabel,
  offLabel,
  successMessage,
}: {
  checked: boolean;
  /** Receives the *requested* new value; the server action re-validates it. */
  action: (next: boolean) => Promise<Result>;
  /** Accessible name (what is being switched). */
  label: string;
  onLabel: string;
  offLabel: string;
  successMessage?: (next: boolean) => string;
}) {
  const [optimisticChecked, setOptimisticChecked] = useOptimistic(checked);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showToast } = useToast();

  function toggle() {
    const next = !checked;
    setError(null);
    startTransition(async () => {
      setOptimisticChecked(next);
      const result = await action(next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (successMessage) showToast(successMessage(next));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={optimisticChecked}
        aria-label={label}
        disabled={isPending}
        onClick={toggle}
        className="group inline-flex w-fit cursor-pointer items-center gap-2.5 rounded-full py-1 disabled:cursor-wait"
      >
        <span
          aria-hidden="true"
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${optimisticChecked ? "bg-brand" : "bg-ink/20"}`}
        >
          <span
            className={`absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              optimisticChecked ? "ltr:translate-x-5 rtl:-translate-x-5" : ""
            }`}
          />
        </span>
        <span className={`text-[0.82rem] ${optimisticChecked ? "font-medium text-ink" : "text-text-secondary"}`}>
          {optimisticChecked ? onLabel : offLabel}
        </span>
      </button>
      {error && (
        <p role="alert" className="m-0 text-[0.74rem] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
