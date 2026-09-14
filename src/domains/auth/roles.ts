import type { Session } from "next-auth";

/**
 * Shared admin-authorization predicate, promoted out of
 * `src/domains/orders/admin-actions.ts` (Phase 10) per this phase's
 * handoff instruction #4 — every admin Server Action added in Phase 11
 * (products/categories/inventory/customers/coupons/content/settings)
 * imports this instead of redefining its own private
 * `isStaffOrAdmin`/role string comparison, so there is exactly one place
 * that decides what "is staff" means.
 *
 * `isAdmin` is a stricter check for the handful of actions Phase 11
 * intentionally restricts beyond plain "staff" — changing another user's
 * role is the clearest example: a `staff` account promoting itself (or
 * anyone else) to `admin` would be a privilege-escalation hole, so role
 * changes require the caller to already be `admin`.
 */

export type SessionUser = NonNullable<Session["user"]>;

export function isStaffOrAdmin(role: string | undefined | null): boolean {
  return role === "admin" || role === "staff";
}

export function isAdmin(role: string | undefined | null): boolean {
  return role === "admin";
}

/** Generic discriminated result every admin Server Action in this phase
 * returns, so client components handle authorization/validation/business
 * errors uniformly (mirrors `AdminTransitionResult` from Phase 10). */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

export const UNAUTHORIZED_ERROR = "شما اجازه دسترسی به این بخش را ندارید";
export const FORBIDDEN_ADMIN_ONLY_ERROR = "این عملیات فقط برای مدیران کل مجاز است";
