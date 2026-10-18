import { normalizeSearchText, textIncludes, type RawParam } from "@/lib/utils/admin-filters";
import type { AdminCouponRow } from "./admin-queries";

/**
 * In-memory filter for `/admin/coupons` (same reasoning as the campaign
 * filter: a small curated list whose "validity" is derived, not stored).
 */

export type CouponValidity = "valid" | "expired" | "exhausted" | "not_started";

export const COUPON_VALIDITY_LABELS: Record<CouponValidity, string> = {
  valid: "معتبر",
  not_started: "شروع نشده",
  expired: "منقضی‌شده",
  exhausted: "سقف پر شده",
};

/** Precedence is the one the list always showed: expired › exhausted › not started › valid. */
export function couponValidity(
  coupon: Pick<AdminCouponRow, "startsAt" | "endsAt" | "usageLimit" | "redemptionCount">,
  now: Date = new Date(),
): CouponValidity {
  if (coupon.endsAt !== null && coupon.endsAt < now) return "expired";
  if (coupon.usageLimit !== null && coupon.redemptionCount >= coupon.usageLimit) return "exhausted";
  if (coupon.startsAt !== null && coupon.startsAt > now) return "not_started";
  return "valid";
}

export type CouponListFilter = {
  q?: string;
  validity?: CouponValidity;
  active?: "on" | "off";
  type?: "percentage" | "fixed";
};

const pick = <T extends string>(value: RawParam, allowed: readonly T[]): T | undefined => {
  const v = Array.isArray(value) ? value[0] : value;
  return allowed.find((item) => item === v);
};

export function parseCouponFilter(raw: { q?: RawParam; validity?: RawParam; active?: RawParam; type?: RawParam }): CouponListFilter {
  return {
    q: normalizeSearchText(raw.q),
    validity: pick(raw.validity, ["valid", "expired", "exhausted", "not_started"] as const),
    active: pick(raw.active, ["on", "off"] as const),
    type: pick(raw.type, ["percentage", "fixed"] as const),
  };
}

export function isCouponFilterActive(filter: CouponListFilter): boolean {
  return Boolean(filter.q || filter.validity || filter.active || filter.type);
}

export function filterCouponsIgnoringValidity(coupons: AdminCouponRow[], filter: CouponListFilter): AdminCouponRow[] {
  return coupons.filter((coupon) => {
    if (filter.active && coupon.isActive !== (filter.active === "on")) return false;
    if (filter.type && coupon.discountType !== filter.type) return false;
    // Codes are stored upper-cased ASCII; the operator may type any case.
    if (filter.q && !textIncludes(coupon.code, filter.q)) return false;
    return true;
  });
}

export function filterCoupons(coupons: AdminCouponRow[], filter: CouponListFilter, now: Date = new Date()): AdminCouponRow[] {
  const base = filterCouponsIgnoringValidity(coupons, filter);
  return filter.validity ? base.filter((coupon) => couponValidity(coupon, now) === filter.validity) : base;
}

export function countCouponsByValidity(coupons: AdminCouponRow[], now: Date = new Date()): Record<CouponValidity, number> {
  const counts: Record<CouponValidity, number> = { valid: 0, not_started: 0, expired: 0, exhausted: 0 };
  for (const coupon of coupons) counts[couponValidity(coupon, now)] += 1;
  return counts;
}
