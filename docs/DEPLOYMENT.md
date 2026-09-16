# Deployment

This document is Phase 14's "deployment configuration" and "production
environment checklist" deliverable (`CLAUDE_BUILD_INSTRUCTIONS.txt` Phase 14
task list). It describes how to run Trends in production as the codebase is
today — it does not assume a specific hosting provider, because none is
fixed anywhere in `TRENDS_PROJECT_CONTEXT.md`.

## Deployment topology this codebase assumes

**A single long-running Node.js process (`next start`), not a
multi-instance/serverless/edge deployment.** This isn't a placeholder
limitation — it's a real constraint baked into two pieces of Phase 13's
security work, and deploying behind a load balancer with more than one
Node process/container **will silently weaken both** without an error or
warning:

1. **Rate limiting** (`src/lib/security/rate-limit.ts`) is an in-process
   `Map`, not Redis (see that file's header comment for the rule A.16/F.6
   reasoning). Each process tracks its own counters — N processes behind a
   load balancer means an attacker's effective allowance multiplies by N.
2. **Sessions** are JWT-strategy (`src/lib/auth/config.ts`, chosen so the
   homepage can stay statically rendered — see that file's comment), so
   they don't need a shared session store to work correctly across
   instances. This part *is* safe to scale horizontally.

If a future phase needs more than one process (traffic growth, zero-downtime
deploys via multiple instances, etc.), the rate limiter is the one piece
that must move to a shared store (Redis, or equivalent) first — that's the
"concrete reason" rule A.16 asks for before adding Redis, not "scalable apps
use Redis."

Suitable targets today: a single VM/container (systemd service, Docker
container, a PaaS's "one instance" tier). Not yet suitable without further
work: Vercel/edge functions, or any autoscaling group with >1 replica.

## Required environment variables

See `.env.example` for the full annotated list. Summary of what's actually
read by the running application today (confirmed by grep, not assumed):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Needed even to run `next build` — see "Build-time database dependency" below. |
| `AUTH_SECRET` | Yes | Read by NextAuth v5 by convention (not an explicit `process.env` reference in this codebase). Generate with `openssl rand -base64 32`. Never reuse across environments. |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public origin, e.g. `https://trends.example.com`. Used for canonical URLs/sitemap/Open Graph (Phase 5). |
| `PAYMENT_PROVIDER` | Yes | Set to `mock` to run the built-in test gateway simulator. **A real Iranian gateway has never been configured in this codebase** (rule A.17) — see `src/domains/payments/provider.ts`. Do not set this to anything but `mock` or an actually-implemented provider name. |
| `PAYMENT_MERCHANT_ID` | With `PAYMENT_PROVIDER` | Passed through to the configured provider. |
| `STORAGE_BUCKET_URL`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | No | Placeholders only — no object storage/CDN integration has been built yet. Product images today are served from `public/` and `next/image` with no `remotePatterns` configured (`next.config.ts`). |
| `SMS_PROVIDER_API_KEY` | No | Placeholder only — no SMS/OTP provider has been implemented. |

Never commit real `.env`/`.env.local` files (already gitignored).

## Build-time database dependency

`npm run build` performs static prerendering for several storefront pages
(`/about`, `/contact`, `/faq`, `/privacy-policy`, `/returns-policy`,
`/shipping-policy`, `/terms`, `/`). At least one of these
(`/contact`, via `getSiteSettings()`) reads from PostgreSQL at build time to
render its static HTML. **`DATABASE_URL` must point at a reachable,
migrated database during `npm run build`, not just at runtime.** A build run
against an unreachable database fails outright — this was reproduced during
Phase 14 verification (Postgres briefly down mid-session): the build error
is unambiguous (`ECONNREFUSED` at the exact query/file/line), not a silent
partial build.

In practice this means: run migrations against the target database first,
then build against that same (or an equivalently seeded/structured)
database, in that order, every deploy.

## Deploy steps

```bash
# 1. Install dependencies
npm ci

# 2. Apply migrations to the target database (idempotent — safe to
#    re-run; already-applied migrations are skipped)
npm run db:migrate

# 3. Build (requires DATABASE_URL reachable — see above)
npm run build

# 4. Start
npm start   # next start, listens on PORT (default 3000)
```

Seeding (`npm run db:seed`) is for local/demo environments only — see
`src/lib/db/seed.ts`. It inserts fixed catalog/hero-slide demo content and
is not part of a production deploy; a production database's catalog is
populated through `/admin`.

## Reverse proxy / TLS

`next start` serves plain HTTP. Terminate TLS at a reverse proxy (nginx,
Caddy, the platform's built-in load balancer, etc.) in front of it — this
codebase sends `Strict-Transport-Security` (`next.config.ts`) on the
assumption that whatever sits in front of it is already terminating HTTPS.
Forward `X-Forwarded-For`/`X-Forwarded-Proto` correctly if the reverse proxy
supports it; `src/lib/security/rate-limit.ts` and any future IP-based logic
depend on this being set correctly, not skipped.

## Process management

Whatever supervises the Node process (systemd, Docker's own restart policy,
a PaaS) should:
- Restart on crash.
- Pass through all required environment variables (see above) — never bake
  secrets into the container image itself.
- Send `SIGTERM` for graceful shutdown (Next.js's default `next start`
  handles this; no custom server is used here so there's nothing extra to
  wire up).

## What is explicitly NOT set up yet

Documented here rather than silently absent, per rule A.18 ("do not
silently invent business requirements") and F.8 ("document meaningful
assumptions"):

- **CI/CD pipeline.** No `.github/workflows` or equivalent exists. `npm run
  typecheck`, `npm run lint`, `npm test`, and (given a database)
  `npm run test:integration` and `npm run build` are the commands a CI
  pipeline should run, in that order — see `docs/PRODUCTION_CHECKLIST.md`.
- **Object storage/CDN for product media** (`TRENDS_PROJECT_CONTEXT.md` §3).
  Product images are currently local files under `public/` referenced
  directly; `next.config.ts`'s `images.remotePatterns` is empty.
- **A real Iranian payment gateway.** Only the mock provider exists.
- **An SMS/OTP provider.** The mobile-verification architecture is ready
  (`.env.example`'s `SMS_PROVIDER_API_KEY` placeholder,
  `TRENDS_PROJECT_CONTEXT.md` §3's "verification/OTP architecture that can
  later connect to an SMS provider") but nothing sends a real SMS today.
- **Managed/automated database backups.** See
  `docs/BACKUP_AND_MIGRATIONS.md` — this documents the strategy and manual
  commands; no automated backup job has been wired into any specific
  provider's tooling because no specific provider is fixed yet.
- **Application-level error/log aggregation service** (Sentry, Datadog, or
  similar). See `docs/OBSERVABILITY.md` for what exists today (structured
  `console.error` calls) versus what a future phase should add.
