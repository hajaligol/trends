"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Generic "click, confirm, run a Server Action, refresh" button for
 * admin list-page destructive/toggle actions (delete category, delete
 * variant, toggle coupon active, etc.) — the same
 * `useTransition` + `router.refresh()` shape
 * `AdminOrderStatusForm.tsx` already established, extracted here since
 * this phase needs the same pattern in ~6 different admin pages.
 */
export function ConfirmButton({
  action,
  confirmMessage,
  label,
  pendingLabel = "در حال اجرا...",
  className = "text-[0.8rem] text-red-600 underline underline-offset-2 hover:opacity-80",
}: {
  action: () => Promise<Result>;
  confirmMessage?: string;
  label: string;
  pendingLabel?: string;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={isPending}
        className={`${className} disabled:opacity-60`}
        onClick={() => {
          if (confirmMessage && !window.confirm(confirmMessage)) return;
          setError(null);
          startTransition(async () => {
            const result = await action();
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {isPending ? pendingLabel : label}
      </button>
      {error && (
        <p role="alert" className="text-[0.75rem] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
