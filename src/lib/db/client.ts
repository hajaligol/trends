import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Single shared PostgreSQL connection pool + Drizzle client for the whole
 * app. Cached on `globalThis` in development so Next.js's hot-reload
 * (which re-evaluates modules but keeps the Node process alive) doesn't
 * open a fresh connection pool on every edit — the standard pattern for
 * connection-based drivers under Next.js dev mode.
 *
 * `DATABASE_URL` is required at runtime for any code path that touches
 * the database. This module intentionally throws at import time if it's
 * missing rather than lazily failing on first query, so a misconfigured
 * environment fails loudly during startup instead of on a random request.
 */

declare global {
  var __trendsDbClient: postgres.Sql | undefined;
}

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and configure a PostgreSQL connection string.",
    );
  }
  return url;
}

const client =
  globalThis.__trendsDbClient ??
  postgres(getConnectionString(), {
    // A modest pool: this is a monolith, not a per-request-serverless
    // function farm yet. Revisit if/when deployment target needs tuning.
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__trendsDbClient = client;
}

export const db = drizzle(client, { schema });
export type Database = typeof db;

/** The exact transaction handle type `db.transaction(async (tx) => ...)`
 * infers for its callback — exported so domain functions that need to
 * participate in a caller's transaction (e.g.
 * `src/domains/promotions/queries.ts`'s `validateCoupon`) can accept it
 * as a typed parameter instead of reaching for `any`. */
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
