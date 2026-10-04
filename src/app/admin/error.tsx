"use client";

import { useEffect } from "react";
import Link from "next/link";
import { adminButton } from "@/components/admin/ui/layout";
import { AlertTriangleIcon } from "@/components/admin/ui/icons";

/**
 * Error boundary scoped to `/admin/**` pages — catches a failure in any
 * individual admin page/data-fetch without taking down the whole admin
 * shell's nav. (Note: per Next.js's App Router semantics, `error.tsx`
 * catches errors from the segment's own page and nested segments, not
 * from `layout.tsx` at the same level — a failure in `AdminLayout`
 * itself would still bubble up to the root `error.tsx`.) Same "never leak
 * stack/SQL/internals" rule as every other error boundary: only the
 * opaque digest is shown, so an operator can quote it to a developer.
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
    <div role="alert" className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-white px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-blush text-[#9b2c2c]">
        <AlertTriangleIcon width={28} height={28} />
      </span>
      <h1 className="m-0 text-[1.15rem] font-bold text-ink">خطایی در بارگذاری این بخش رخ داد</h1>
      <p className="m-0 text-[0.88rem] leading-7 text-text-secondary">
        اطلاعات شما از بین نرفته است. لطفاً دوباره تلاش کنید؛ اگر مشکل تکرار شد، کد پیگیری زیر را به تیم فنی بدهید.
      </p>
      <div className="flex flex-wrap justify-center gap-2.5">
        <button type="button" onClick={() => reset()} className={adminButton("primary", "md")}>
          تلاش مجدد
        </button>
        <Link href="/admin" className={adminButton("secondary", "md")}>
          بازگشت به داشبورد
        </Link>
      </div>
      {error.digest && (
        <p className="m-0 text-[0.74rem] text-text-secondary/80" dir="ltr">
          کد پیگیری: {error.digest}
        </p>
      )}
    </div>
  );
}
