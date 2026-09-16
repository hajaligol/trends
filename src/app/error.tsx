"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";

/**
 * Root error boundary for everything under `RootLayout` (storefront,
 * account, checkout, etc.) — CLAUDE_BUILD_INSTRUCTIONS.txt Phase 14's
 * "error boundary pass" task and §11's "safe error messages" (never leak
 * stack traces/internals to the customer).
 *
 * Must be a Client Component (Next.js requirement for `error.tsx`) — the
 * actual error is only ever logged server-side by Next.js itself before
 * this renders; nothing here ever displays `error.message` or
 * `error.stack` to the visitor, only a generic Persian message, per the
 * same "no leaking stack traces/SQL/internals" rule Server Actions
 * already follow. `error.digest` (Next.js's server-side log correlation
 * id) is shown so a support conversation can reference it without
 * exposing anything sensitive.
 *
 * Rendered *inside* `RootLayout` (Header/Footer/overlays still mount
 * around it), unlike `global-error.tsx` which only fires if the root
 * layout itself throws and must supply its own `<html>`/`<body>`.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side console log only, for local debugging — the real,
    // durable server-side log already happened in Next.js's own error
    // reporting before this component ever rendered. No secrets/stack
    // details are sent anywhere from here.
    console.error("[trends] Unhandled error boundary:", error);
  }, [error]);

  return (
    <main className="py-[clamp(60px,10vw,120px)]">
      <Container className="flex flex-col items-center gap-4 text-center">
        <p className="text-[0.9rem] text-text-secondary">خطا</p>
        <h1 className="m-0 text-[clamp(1.5rem,3vw,2rem)] font-bold">مشکلی پیش آمد</h1>
        <p className="max-w-sm text-[0.95rem] text-text-secondary">
          متأسفانه در بارگذاری این صفحه خطایی رخ داد. لطفاً دوباره تلاش کنید یا به صفحه اصلی بازگردید.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-ink px-6 py-2.5 text-[0.9rem] font-semibold text-white transition-opacity hover:opacity-88"
          >
            تلاش مجدد
          </button>
          <Link
            href="/"
            className="rounded-full bg-white px-6 py-2.5 text-[0.9rem] font-semibold text-ink transition-opacity hover:opacity-85"
          >
            بازگشت به صفحه اصلی
          </Link>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs text-text-secondary/70" dir="ltr">
            کد پیگیری: {error.digest}
          </p>
        )}
      </Container>
    </main>
  );
}
