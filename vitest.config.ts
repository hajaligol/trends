import { defineConfig } from "vitest/config";

/**
 * Vitest configuration — Phase 14 ("choosing and wiring up the test
 * framework is itself part of this phase's scope", per PROGRESS.md's
 * Next Session Instructions).
 *
 * Two test projects, matching CLAUDE_BUILD_INSTRUCTIONS.txt Phase 14's
 * task list ("unit tests for business-critical functions, integration
 * tests for catalog/cart/checkout/payment/order transitions"):
 *
 * - `tests/unit/**` — pure functions only (money formatting, phone
 *   normalization, order-status transition table, etc.). No database,
 *   no network. Safe to run anywhere, including CI without Postgres.
 * - `tests/integration/**` — exercise the real domain layer
 *   (`src/domains/**`) against a real PostgreSQL database via
 *   `DATABASE_URL`, the same pattern every phase since Phase 6 has used
 *   for its own ad-hoc verification scripts (`Promise.allSettled` race
 *   tests, cross-user ownership checks, duplicate-callback idempotency,
 *   etc.) — now made permanent and repeatable instead of thrown away.
 *   These require a running Postgres and `.env.local`/`DATABASE_URL`;
 *   `npm run test:integration` documents that requirement, and each
 *   integration test file fails fast with a clear message if
 *   `DATABASE_URL` is missing rather than hanging.
 *
 * `npm test` runs unit tests only (no external dependency, safe as a
 * pre-commit/CI default). `npm run test:integration` runs the
 * database-backed suite. `npm run test:all` runs both.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // Integration tests share one real Postgres database and some tests
    // deliberately create real row-level lock contention
    // (payment/coupon race tests) — running test files in parallel
    // workers would make unrelated files race each other's fixtures on
    // the same connection pool. Serial file execution keeps the suite
    // deterministic; individual `it()`s within a race test still run
    // concurrently via `Promise.allSettled`, which is the actual thing
    // being tested.
    fileParallelism: false,
  },
});
