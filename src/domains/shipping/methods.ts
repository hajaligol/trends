/**
 * Shipping-method abstraction, per TRENDS_PROJECT_CONTEXT.md §5
 * "Shipping" (methods, fee, free-shipping threshold, estimated delivery,
 * serviceability rules) and §8 "free-shipping threshold configuration".
 *
 * This is a small, self-contained module (not a database table) — the
 * two methods below and the free-shipping threshold are business
 * configuration, not user-generated data, and CLAUDE_BUILD_INSTRUCTIONS.txt
 * rule F.1/F.6 ("prefer the simplest production-safe solution", "prefer
 * fewer dependencies") favors a typed config module over a `shipping_methods`
 * table for something this small and static. If a future phase needs
 * admin-editable shipping methods (§7 "shipping settings"), promoting
 * this to a table is a contained migration — every call site already
 * goes through `getShippingMethod`/`listShippingMethods`, never a
 * hardcoded literal.
 *
 * **Assumption (documented per rule A.18):** since
 * TRENDS_PROJECT_CONTEXT.md doesn't specify real courier names, fees, or
 * delivery windows, these are placeholder business values typical of an
 * Iranian online store (Tipax/Post-style standard shipping + a paid
 * express option), clearly not sourced from a real contracted courier.
 * Whoever operates the store should replace `FEE_TOMAN`/`FREE_SHIPPING_THRESHOLD_TOMAN`
 * with real figures before launch.
 */

export type ShippingMethod = {
  code: string;
  label: string;
  estimateLabel: string;
  feeToman: number;
};

const FREE_SHIPPING_THRESHOLD_TOMAN = 2_000_000;

const BASE_METHODS: ShippingMethod[] = [
  {
    code: "standard",
    label: "ارسال استاندارد (پست پیشتاز)",
    estimateLabel: "۳ تا ۵ روز کاری",
    feeToman: 90_000,
  },
  {
    code: "express",
    label: "ارسال اکسپرس",
    estimateLabel: "۱ تا ۲ روز کاری",
    feeToman: 180_000,
  },
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
export function listShippingMethods(subtotalToman: number): ShippingMethod[] {
  const qualifiesForFreeStandard = subtotalToman >= FREE_SHIPPING_THRESHOLD_TOMAN;
  return BASE_METHODS.map((method) =>
    method.code === "standard" && qualifiesForFreeStandard
      ? { ...method, feeToman: 0, label: `${method.label} (رایگان)` }
      : method,
  );
}

export function getShippingMethod(code: string, subtotalToman: number): ShippingMethod | null {
  return listShippingMethods(subtotalToman).find((method) => method.code === code) ?? null;
}

export { FREE_SHIPPING_THRESHOLD_TOMAN };
