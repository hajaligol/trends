import type { Tone } from "@/components/admin/ui/layout";
import type { OrderStatus } from "@/domains/orders/lifecycle";

/** Visual tone for each order status — one place so list, detail and
 * dashboard always agree. */
export const ORDER_STATUS_TONES: Record<OrderStatus, Tone> = {
  pending_payment: "warning",
  paid: "info",
  processing: "purple",
  shipped: "purple",
  delivered: "success",
  cancelled: "danger",
  refunded: "neutral",
};

export const ROLE_LABELS: Record<string, string> = { customer: "مشتری", staff: "کارمند", admin: "مدیر کل" };
export const ROLE_TONES: Record<string, Tone> = { customer: "neutral", staff: "info", admin: "purple" };
