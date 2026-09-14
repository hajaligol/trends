import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";
import type { SessionUser } from "@/domains/auth/roles";

/**
 * Records a sensitive admin action into the general `audit_logs` table
 * (Phase 11), per TRENDS_PROJECT_CONTEXT.md §11 ("audit logs for
 * sensitive admin actions"). Every admin Server Action in this phase
 * that actually mutates something (not read-only list/detail views)
 * calls this after its mutation succeeds — never before, so a failed/
 * rejected mutation never produces a misleading log entry.
 *
 * `actor` is always the real signed-in `session.user` the calling action
 * already authorized against — never a value trusted from the request
 * body — mirroring `adminTransitionOrderStatusAction`'s existing pattern
 * of reading `session.user.id` for `order_status_history`.
 *
 * `payload` is JSON.stringify'd here so call sites just pass a plain
 * object; deliberately un-typed (`Record<string, unknown>`) since each
 * action's "what changed" shape is different — see `audit-logs.ts`'s
 * header comment for why this is a single text column instead of a
 * typed `jsonb` schema. Never pass secrets/tokens/password hashes.
 */
export async function recordAuditLog(
  actor: SessionUser,
  action: string,
  entityType: string,
  entityId: string | null,
  payload?: Record<string, unknown>,
): Promise<void> {
  await db.insert(auditLogs).values({
    actorId: actor.id,
    actorMobile: actor.mobile,
    action,
    entityType,
    entityId,
    payload: payload ? JSON.stringify(payload) : null,
  });
}

export type AuditLogRow = typeof auditLogs.$inferSelect;

export type AuditLogFilter = {
  entityType?: string;
  page?: number;
  pageSize?: number;
};

export type AuditLogPage = {
  rows: AuditLogRow[];
  page: number;
  pageSize: number;
  total: number;
};

/** Not ownership-scoped (there is no "owning customer" for a global
 * activity log) — same pattern as `listOrdersForAdmin`: authorization is
 * the caller's job (the `/admin` layout's role gate), this function only
 * answers "what happened." */
export async function listAuditLogs({ entityType, page = 1, pageSize = 50 }: AuditLogFilter = {}): Promise<AuditLogPage> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const where: SQL | undefined = entityType ? eq(auditLogs.entityType, entityType) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(where ? and(where) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize),
    db.select({ id: auditLogs.id }).from(auditLogs).where(where ? and(where) : undefined),
  ]);

  return { rows, page: safePage, pageSize: safePageSize, total: totalRows.length };
}

/** Distinct `entityType` values that have ever been logged, used to
 * populate the audit-log page's filter dropdown without hardcoding a
 * list that could drift from what's actually recorded. */
export async function listAuditLogEntityTypes(): Promise<string[]> {
  const rows = await db.selectDistinct({ entityType: auditLogs.entityType }).from(auditLogs);
  return rows.map((row) => row.entityType).sort();
}
