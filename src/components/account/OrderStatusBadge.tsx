import { ORDER_STATUS_LABELS } from "@/domains/orders/lifecycle";

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending_payment: "bg-[#FBE1B4]/60 text-ink",
  paid: "bg-[#D2D9BF]/60 text-ink",
  processing: "bg-[#AAD0E2]/50 text-ink",
  shipped: "bg-[#B5D6CF]/60 text-ink",
  delivered: "bg-[#D2D9BF] text-ink",
  cancelled: "bg-ink/[0.08] text-text-secondary",
  refunded: "bg-ink/[0.08] text-text-secondary",
};

/** Pastel order-status pill, shared by the dashboard and the orders list. */
export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[0.78rem] font-semibold ${
        STATUS_BADGE_CLASSES[status] ?? "bg-ink/[0.06] text-ink"
      }`}
    >
      {ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status}
    </span>
  );
}
