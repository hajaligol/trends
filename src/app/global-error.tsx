"use client";

import { useEffect } from "react";

/**
 * Fires only if `RootLayout` itself throws (so `error.tsx` — which
 * renders *inside* the layout — can't catch it). Next.js requires this
 * file to render its own complete `<html>`/`<body>`, since the normal
 * layout tree is presumed broken. Deliberately minimal inline styles
 * only (no Tailwind/globals.css dependency, no Header/Footer/providers)
 * — if the layout providers themselves are what's throwing, this page
 * must not depend on any of them to render. Same "no stack
 * traces/internals leaked to the visitor" rule as `error.tsx`.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[trends] Unhandled error in root layout:", error);
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Vazirmatn, Tahoma, 'Segoe UI', sans-serif",
          background: "#FBF9F5",
          color: "#182630",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 380, padding: 24 }}>
          <p style={{ fontSize: "0.9rem", color: "#566066", margin: 0 }}>خطا</p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "8px 0" }}>
            مشکلی در بارگذاری سایت پیش آمد
          </h1>
          <p style={{ fontSize: "0.95rem", color: "#566066", margin: "0 0 16px" }}>
            لطفاً صفحه را دوباره بارگذاری کنید.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              borderRadius: 999,
              background: "#182630",
              color: "#fff",
              border: 0,
              padding: "10px 24px",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            تلاش مجدد
          </button>
          {error.digest && (
            <p style={{ marginTop: 16, fontSize: "0.75rem", color: "rgba(86,96,102,0.7)" }} dir="ltr">
              کد پیگیری: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
