"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Error boundary scoped to `/admin/**` pages — catches a failure in any
 * individual admin page/data-fetch without taking down the whole admin
 * shell's nav. (Note: per Next.js's App Router semantics, `error.tsx`
 * catches errors from the segment's own page and nested segments, not
 * from `layout.tsx` at the same level — a failure in `AdminLayout`
 * itself would still bubble up to the root `error.tsx`.) Denser,
 * utilitarian tone matches TRENDS_PROJECT_CONTEXT.md §13's "Admin UI may
 * be denser and more utilitarian" — no illustration, just the essentials
 * an operator needs to retry or navigate away. Same "never leak
 * stack/SQL/internals" rule as every other error boundary.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[trends admin] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-3 rounded-[14px] border border-black/10 bg-white p-6 text-right">
      <p className="text-[0.85rem] font-semibold text-red-600">خطایی در بارگذاری این بخش رخ داد</p>
      <p className="text-[0.85rem] text-text-secondary">
        لطفاً دوباره تلاش کنید. در صورت تکرار مشکل، با تیم فنی تماس بگیرید.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-ink px-5 py-2 text-[0.85rem] font-semibold text-white transition-opacity hover:opacity-88"
        >
          تلاش مجدد
        </button>
        <Link
          href="/admin"
          className="rounded-full bg-[#F1F3EC] px-5 py-2 text-[0.85rem] font-semibold text-ink transition-opacity hover:opacity-85"
        >
          بازگشت به داشبورد
        </Link>
      </div>
      {error.digest && (
        <p className="text-xs text-text-secondary/70" dir="ltr">
          کد پیگیری: {error.digest}
        </p>
      )}
    </div>
  );
}
