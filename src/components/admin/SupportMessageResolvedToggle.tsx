"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSupportMessageResolvedAction } from "@/domains/support/admin-actions";

export function SupportMessageResolvedToggle({ id, isResolved }: { id: string; isResolved: boolean }) {
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
            const result = await toggleSupportMessageResolvedAction(id, !isResolved);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        className={`w-fit rounded-full px-3 py-1 text-[0.75rem] transition-opacity disabled:opacity-60 ${
          isResolved ? "bg-sage text-ink" : "bg-header text-text-secondary"
        }`}
      >
        {isResolved ? "حل شده" : "بدون پاسخ"}
      </button>
      {error && <p className="text-[0.72rem] text-red-700">{error}</p>}
    </div>
  );
}
