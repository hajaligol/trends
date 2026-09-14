import { getSiteSettings } from "@/domains/admin/settings-queries";

/**
 * Shipping-method abstraction, per TRENDS_PROJECT_CONTEXT.md §5
 * "Shipping" (methods, fee, free-shipping threshold, estimated delivery,
 * serviceability rules) and §8 "free-shipping threshold configuration".
 *
 * Method labels/estimates/codes stay a small typed config module
 * here (not a database table) — CLAUDE_BUILD_INSTRUCTIONS.txt rule
 * F.1/F.6 ("prefer the simplest production-safe solution", "prefer fewer
 * dependencies") still favors that over a `shipping_methods` table for
 * something this static (no admin task asks for adding/removing
 * *methods*, only editing their *fees* and the threshold).
 *
 * Phase 11 promoted exactly what §7's "shipping settings" admin task
 * asked for — the fee amounts and the free-shipping threshold — to the
 * admin-editable `site_settings` singleton row (see
 * `src/domains/admin/settings-queries.ts`), fulfilling this module's own
 * previously-documented migration note ("if a future phase needs
 * admin-editable shipping methods, promoting this to a table is a
 * contained migration"). `getShippingMethod`/`listShippingMethods`
 * became async as a result; both of their only two call sites
 * (`src/app/checkout/page.tsx`, `src/domains/orders/actions.ts`) already
 * ran inside `async` server functions, so this was a same-file,
 * low-risk change.
 */

export type ShippingMethod = {
  code: string;
  label: string;
  estimateLabel: string;
  feeToman: number;
};

type BaseMethod = { code: string; label: string; estimateLabel: string };

const BASE_METHODS: BaseMethod[] = [
  { code: "standard", label: "ارسال استاندارد (پست پیشتاز)", estimateLabel: "۳ تا ۵ روز کاری" },
  { code: "express", label: "ارسال اکسپرس", estimateLabel: "۱ تا ۲ روز کاری" },
];

/**
 * All serviceable methods for a given subtotal, with `feeToman` already
 * adjusted for the free-shipping threshold (§5 "free-shipping
 * threshold") — `standard` becomes free above the threshold; `express`
 * always carries its fee, since "free shipping" conventionally doesn't
 * extend to a paid faster tier. There are no per-region serviceability
 * rules yet (§5 "serviceability rules") since the catalog has no
 * region-restricted products — every method is available everywhere in
 * Iran for now; a future phase can filter this list by the selected
 * address's province if that becomes a real requirement.
 */
export async function listShippingMethods(subtotalToman: number): Promise<ShippingMethod[]> {
  const settings = await getSiteSettings();
  const feeByCode: Record<string, number> = {
    standard: settings.standardShippingFeeToman,
    express: settings.expressShippingFeeToman,
  };
  const qualifiesForFreeStandard = subtotalToman >= settings.freeShippingThresholdToman;

  return BASE_METHODS.map((method) => {
    const feeToman = feeByCode[method.code] ?? 0;
    if (method.code === "standard" && qualifiesForFreeStandard) {
      return { ...method, feeToman: 0, label: `${method.label} (رایگان)` };
    }
    return { ...method, feeToman };
  });
}

export async function getShippingMethod(code: string, subtotalToman: number): Promise<ShippingMethod | null> {
  const methods = await listShippingMethods(subtotalToman);
  return methods.find((method) => method.code === code) ?? null;
}
