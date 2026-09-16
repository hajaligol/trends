# Observability & logging plan

Phase 14's "observability/logging plan" deliverable
(`CLAUDE_BUILD_INSTRUCTIONS.txt` Phase 14 task list). Describes what
exists today versus what a future phase should add before relying on this
purely for production incident response.

## What exists today

### Business-event audit trail (structured, in the database)

Two tables carry the "what happened, who did it, when" record that
actually matters for a commerce app — not general application logs, but
durable, queryable business facts:

- **`audit_logs`** (`src/lib/db/schema/audit-logs.ts`, written via
  `src/domains/analytics/audit.ts`) — every privileged admin mutation
  (product/coupon/category/settings edits, role changes, stock
  adjustments). Records `actorId`/`actorMobile` snapshot, action type, and
  a loose JSON payload describing what changed. Survives actor account
  deletion (`onDelete: "set null"`). **Never contains secrets** — payment
  credentials, password hashes, and tokens are excluded by convention at
  every call site (see that file's header comment).
- **`order_status_history`** (Phase 10) — the order-specific counterpart,
  tracking every status transition an order goes through.
- **`payment_events`** (Phase 9) — every payment provider callback/event,
  including duplicates and failures, keyed to the payment they belong to.
  This is what makes the idempotency guarantees in
  `tests/integration/payment-idempotency.test.ts` inspectable after the
  fact, not just correct in the moment.

These three tables together are the right first place to look when
investigating "what happened to order X" — they answer it directly from
SQL, no log-aggregation tooling required.

### Application/error logging (unstructured, process stdout/stderr)

- `console.error` calls in the three error boundaries
  (`src/app/error.tsx`, `src/app/global-error.tsx`,
  `src/app/admin/error.tsx`) and in `src/domains/notifications/provider.ts`
  (the console-log notification stub — see that file's header comment for
  why: no real SMS/email provider is configured, rule A.17).
- Next.js's own server-side error logging (automatic — every server-side
  exception, including ones caught by an `error.tsx` boundary, is already
  logged to the Node process's stderr with a stack trace by Next.js
  itself, before the boundary's own `console.error` ever runs client-side).
- Whatever the deployment platform captures from the process's stdout/
  stderr (systemd journal, `docker logs`, a PaaS's log stream) is,
  **today, the entire durable record of unstructured application
  errors.** There is no log aggregation service wired in.

### Payment-callback observability

`finalizePaymentVerification` (`src/domains/payments/queries.ts`) writes a
`payment_events` row for every callback it processes — including
`duplicate_ignored` events for callbacks that arrived after the payment
was already settled. This means payment-related incidents ("did we get a
duplicate callback? did the gateway retry?") are answerable from the
database directly, without needing external logs — verified directly in
Phase 14's integration tests
(`tests/integration/payment-idempotency.test.ts` asserts the exact event
counts for both real and duplicate callbacks).

## What does NOT exist yet — recommended for a future phase

- **No external error-tracking service** (Sentry, Bugsnag, or similar).
  `error.tsx`'s `console.error` calls are exactly where such a service's
  SDK call would be added — the integration point already exists, wiring
  in the actual SDK/DSN is the remaining work.
- **No structured application logging** (e.g. `pino`/`winston` with JSON
  output, correlation IDs per request). Today's `console.error` calls are
  plain strings; a production incident spanning multiple requests has no
  shared request/trace ID to grep by.
- **No metrics/APM** (request latency, error rate, database query timing,
  Core Web Vitals collection in the field). `next build`'s own output
  gives static/dynamic route classification (see `docs/DEPLOYMENT.md`'s
  build log) but nothing collects real-user performance data today.
- **No uptime/health-check endpoint.** There is no `/api/health` or
  equivalent — a load balancer or uptime monitor currently has nothing
  purpose-built to poll. (Any static page, e.g. `/robots.txt`, works as a
  crude substitute today, but doesn't verify database connectivity the
  way a real health check should.)
- **No alerting** (on error rate, failed payment-callback rate, rate-limit
  trip frequency, etc.) — everything above is passively recorded, nothing
  actively pages anyone.
- **No log retention/rotation policy** for the audit tables — `audit_logs`,
  `order_status_history`, and `payment_events` grow unboundedly today.
  Fine at current scale; revisit with an archival strategy once volume
  actually warrants it (don't add complexity speculatively — rule F.5).

## Recommended minimum before handling real customer payments

In priority order, given this app's actual risk profile (real money moving
through `payment_events` once a real gateway is configured):

1. **External error tracking** (Sentry class) wired into the three
   `error.tsx` boundaries and into `finalizePaymentVerification`'s error
   paths specifically — a silently-failing payment verification is the
   single worst class of bug this app can ship.
2. **A `/api/health` route** that checks database connectivity, for the
   load balancer/uptime monitor.
3. **Basic alerting** on payment-callback failure rate and 5xx rate, even
   crude (a scheduled query against `payment_events`/`audit_logs` plus a
   webhook, if a dedicated APM isn't budgeted yet).
4. Structured logging with request correlation, once request volume makes
   grepping plain-text stdout genuinely painful — not before.
