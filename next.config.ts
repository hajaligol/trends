import type { NextConfig } from "next";

/**
 * Security headers (Phase 13 — CLAUDE_BUILD_INSTRUCTIONS.txt §11
 * "security headers" / "CSP where practical"), applied to every route
 * via `headers()` rather than per-page, so nothing new added later can
 * accidentally ship without them.
 *
 * **The Content-Security-Policy is production-only** (see `headers()`
 * below, gated on `process.env.NODE_ENV === "production"`). This was a
 * real bug in the first version of this file, caught after delivery:
 * Next.js/React's *development* mode genuinely needs `eval()` for
 * things like reconstructing component stack traces and Turbopack's
 * HMR machinery — with no `'unsafe-eval'` in `script-src`, `next dev`
 * throws "eval() is not supported in this environment" in the browser
 * console. Production React never calls `eval()` at all, so the
 * correct fix is not to weaken the policy with `'unsafe-eval'`
 * everywhere, but to only send this CSP when actually serving a
 * production build — `next dev`/`next start` set `NODE_ENV`
 * automatically, so this needs no extra configuration or env var.
 *
 * **Content-Security-Policy is intentionally not the strict,
 * nonce-based `script-src 'nonce-...' 'strict-dynamic'` form** Next.js
 * supports via middleware. That approach needs a `middleware.ts`
 * generating a fresh nonce per request and depends on every one of
 * Next's own injected hydration/RSC-payload scripts picking it up
 * correctly — this repo has no browser-automation tooling available in
 * any session so far (see every phase's PROGRESS.md "What was not
 * verified" notes) to actually click through the app afterward and
 * confirm hydration/interactivity still works, and a CSP misconfigured
 * in that direction fails *closed* (a blank, non-interactive page) —
 * a materially worse outcome for a customer-facing storefront than
 * today's absence of a header. Per rule F.1 ("prefer the simplest
 * production-safe solution") and F.5 ("prefer maintainability over
 * cleverness"), this ships a real, restrictive-where-verifiable CSP
 * built entirely from `next build`/`curl`-observable facts about this
 * specific app (no external script/font/analytics origins anywhere in
 * the codebase — confirmed by grep, not assumed) instead. `script-src`
 * and `style-src` need `'unsafe-inline'` because: (a) Next.js's own
 * App Router injects inline hydration/RSC-payload `<script>` tags with
 * no nonce support wired up, and (b) several components use React's
 * `style={{...}}` inline style prop (confirmed via grep — 6 files).
 * Documented here as this phase's one explicitly-deferred, larger-scope
 * item — see `PROGRESS.md`'s Phase 13 write-up for the exact follow-up
 * (a session with browser automation available should implement the
 * nonce-based version and click through the whole app afterward).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // Belt-and-suspenders alongside `frame-ancestors 'none'` above — older
  // browsers that don't understand CSP's `frame-ancestors` still honor
  // this legacy header, and it's harmless to send both.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deny every powerful browser feature this storefront never uses.
  // Add an entry back here (e.g. `geolocation=(self)`) the moment a
  // real feature needs it — never widen this speculatively.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // Harmless to always send even before HTTPS is fully rolled out in
  // every environment — browsers only ever act on it over a connection
  // that was already HTTPS, so it can't downgrade an HTTP deployment.
  // `preload` is deliberately omitted: that's a one-way submission to
  // browser vendors' preload lists and should be an explicit, later
  // operator decision, not something this codebase opts a deployment
  // into by default.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Remote product/media hosts will be added here once object storage/CDN
    // is introduced (see TRENDS_PROJECT_CONTEXT.md §9 / §3 Infrastructure).
    remotePatterns: [],
  },
  async headers() {
    // See `contentSecurityPolicy`'s header comment above for why this
    // is production-only: `next dev`'s eval()-based debugging/HMR
    // machinery needs `'unsafe-eval'`, which a production CSP should
    // never grant, so the simplest correct fix is not sending a CSP at
    // all in development rather than trying to maintain two different
    // policies that both need to stay correct.
    const headers =
      process.env.NODE_ENV === "production"
        ? [...securityHeaders, { key: "Content-Security-Policy", value: contentSecurityPolicy }]
        : securityHeaders;

    return [
      {
        source: "/:path*",
        headers,
      },
    ];
  },
};

export default nextConfig;
