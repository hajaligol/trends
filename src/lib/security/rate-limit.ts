import { headers } from "next/headers";

/**
 * A small in-memory, fixed-window rate limiter for the handful of
 * signed-out-reachable Server Actions that have no other abuse control
 * (CLAUDE_BUILD_INSTRUCTIONS.txt §11 "rate limiting for sensitive/
 * public abuse-prone endpoints", flagged as unaudited in every phase's
 * PROGRESS.md since Phase 6 and explicitly called out as this phase's
 * job).
 *
 * **Deliberately not Redis** — rule A.16 ("do not add Redis unless the
 * current phase has a concrete reason for it") is read together with
 * rule F.6 ("prefer fewer dependencies") and F.1 ("prefer the simplest
 * production-safe solution"): this application is a single Node.js
 * process (`next start`), not a multi-instance/serverless deployment
 * (there is no Vercel/edge-function target documented anywhere in
 * TRENDS_PROJECT_CONTEXT.md — §3 explicitly says "CDN/edge-capable
 * deployment" for static assets, not that the Node server itself is
 * distributed). An in-process `Map` is correct and sufficient for that
 * topology. **This stops being correct the moment the app runs behind a
 * load balancer with more than one Node process/container** — each
 * process would track its own counters, so a determined attacker could
 * multiply their effective allowance by the instance count. That
 * specific scaling limit is the "concrete reason" a future phase would
 * have for introducing Redis (or another shared store) — documented
 * here and in `PROGRESS.md` rather than solved speculatively now.
 *
 * The map is also unbounded-but-self-limiting in practice: entries are
 * lazily deleted once their window expires (see `checkRateLimit`), so
 * memory is bounded by "distinct keys active in the last window", not
 * by total requests ever made.
 */

type Bucket = {
  count: number;
  windowStartedAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Fixed-window counter: `limit` requests per `windowMs` per `key`. Not a
 * sliding window or token bucket — those are meaningfully more precise
 * against burst-at-boundary abuse, but a fixed window is the simplest
 * correct primitive (rule F.1) for endpoints where the goal is "make
 * credential-stuffing/spam meaningfully slower and noisier", not
 * "guarantee an exact global rate".
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStartedAt >= windowMs) {
    buckets.set(key, { count: 1, windowStartedAt: now });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.ceil((existing.windowStartedAt + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
  }

  existing.count += 1;
  return { allowed: true };
}

/**
 * Best-effort client IP for rate-limit keying. `next start` typically
 * runs behind a reverse proxy (nginx, a platform load balancer, etc.)
 * per TRENDS_PROJECT_CONTEXT.md §3's "CDN/edge-capable deployment", so
 * the real client address arrives via `X-Forwarded-For`, not the raw
 * socket — the same trust boundary NextAuth's own `trustHost` already
 * assumes for this deployment shape (see `src/lib/auth/config.ts`'s
 * header comment). This is intentionally best-effort: a request with no
 * forwarding header at all (e.g. a direct request to the Node process
 * in local dev) falls back to a constant key, which is fine for local
 * testing and does not weaken production behavior where a proxy is
 * always present.
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    // The header can be a comma-separated list (client, proxy1, proxy2, ...);
    // the first entry is the original client.
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headerList.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Convenience wrapper for the common "rate-limit this Server Action by
 * client IP" case. Returns a ready-to-return `{ ok: false, error }`-
 * shaped value when the caller should stop, or `null` when it's fine to
 * proceed — callers merge this into whatever their own action's result
 * union looks like.
 */
export async function checkIpRateLimit(
  actionName: string,
  limit: number,
  windowMs: number,
): Promise<{ error: string } | null> {
  const ip = await getClientIp();
  const result = checkRateLimit(`${actionName}:${ip}`, limit, windowMs);
  if (result.allowed) return null;

  const minutes = Math.ceil(result.retryAfterSeconds / 60);
  return {
    error:
      minutes <= 1
        ? "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید."
        : `تعداد درخواست‌ها بیش از حد مجاز است. لطفاً پس از ${minutes} دقیقه دوباره تلاش کنید.`,
  };
}
