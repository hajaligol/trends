"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSubscriberActiveAction } from "@/domains/newsletter/admin-actions";

/** Same shape as `CouponActiveToggle` (Phase 11) — a toggle button that
 * calls the admin Server Action and refreshes on success. */
export function SubscriberActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await toggleSubscriberActiveAction(id, !isActive);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        className={`w-fit rounded-full px-3 py-1 text-[0.75rem] transition-opacity disabled:opacity-60 ${
          isActive ? "bg-sage text-ink" : "bg-header text-text-secondary"
        }`}
      >
        {isActive ? "مشترک" : "لغو اشتراک شده"}
      </button>
      {error && <p className="text-[0.72rem] text-red-700">{error}</p>}
    </div>
  );
}
