import type { StockState } from "@/domains/catalog/queries";

const LABEL: Record<StockState, string> = {
  "in-stock": "موجود",
  "low-stock": "تعداد محدود",
  "out-of-stock": "ناموجود",
};

const CLASSES: Record<StockState, string> = {
  "in-stock": "text-[#4C7A5D]",
  "low-stock": "text-[#B8873A]",
  "out-of-stock": "text-[#B0453C]",
};

/**
 * Small text badge for a product's stock state. Deliberately text-only
 * (no colored pill/background) to stay in the prototype's restrained,
 * editorial visual language rather than introducing a dashboard-style
 * status chip.
 */
export function StockBadge({ state, className = "" }: { state: StockState; className?: string }) {
  if (state === "in-stock") return null;
  return <p className={`text-[0.82rem] font-medium ${CLASSES[state]} ${className}`}>{LABEL[state]}</p>;
}
