import { describe, expect, it } from "vitest";
import {
  canAdminTransition,
  canCustomerCancel,
  getAdminAllowedNextStatuses,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/domains/orders/lifecycle";

const ALL_STATUSES: OrderStatus[] = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

describe("canCustomerCancel", () => {
  it("allows cancellation before shipping", () => {
    expect(canCustomerCancel("pending_payment")).toBe(true);
    expect(canCustomerCancel("paid")).toBe(true);
    expect(canCustomerCancel("processing")).toBe(true);
  });

  it("disallows self-service cancellation once shipped or in a terminal state", () => {
    expect(canCustomerCancel("shipped")).toBe(false);
    expect(canCustomerCancel("delivered")).toBe(false);
    expect(canCustomerCancel("cancelled")).toBe(false);
    expect(canCustomerCancel("refunded")).toBe(false);
  });
});

describe("canAdminTransition / getAdminAllowedNextStatuses", () => {
  it("never allows any status to transition to itself", () => {
    for (const status of ALL_STATUSES) {
      expect(canAdminTransition(status, status)).toBe(false);
    }
  });

  it("never allows a transition to 'paid' — only a verified payment callback may set it", () => {
    for (const status of ALL_STATUSES) {
      expect(canAdminTransition(status, "paid")).toBe(false);
    }
  });

  it("follows the documented happy path: pending_payment -> processing is NOT allowed directly (paid is required first)", () => {
    expect(canAdminTransition("pending_payment", "processing")).toBe(false);
  });

  it("allows the documented forward path once paid", () => {
    expect(canAdminTransition("paid", "processing")).toBe(true);
    expect(canAdminTransition("processing", "shipped")).toBe(true);
    expect(canAdminTransition("shipped", "delivered")).toBe(true);
  });

  it("allows cancellation from every pre-shipment status", () => {
    expect(canAdminTransition("pending_payment", "cancelled")).toBe(true);
    expect(canAdminTransition("paid", "cancelled")).toBe(true);
    expect(canAdminTransition("processing", "cancelled")).toBe(true);
  });

  it("disallows cancellation once shipped or delivered", () => {
    expect(canAdminTransition("shipped", "cancelled")).toBe(false);
    expect(canAdminTransition("delivered", "cancelled")).toBe(false);
  });

  it("allows cancelled -> refunded as the one manual-reconciliation transition", () => {
    expect(canAdminTransition("cancelled", "refunded")).toBe(true);
  });

  it("treats delivered and refunded as terminal (no allowed next statuses)", () => {
    expect(getAdminAllowedNextStatuses("delivered")).toEqual([]);
    expect(getAdminAllowedNextStatuses("refunded")).toEqual([]);
  });

  it("never allows skipping backward from a later status to an earlier one", () => {
    expect(canAdminTransition("shipped", "processing")).toBe(false);
    expect(canAdminTransition("delivered", "shipped")).toBe(false);
    expect(canAdminTransition("processing", "paid")).toBe(false);
  });

  it("getAdminAllowedNextStatuses matches canAdminTransition for every status pair", () => {
    for (const from of ALL_STATUSES) {
      const allowed = getAdminAllowedNextStatuses(from);
      for (const to of ALL_STATUSES) {
        expect(canAdminTransition(from, to)).toBe(allowed.includes(to));
      }
    }
  });
});

describe("ORDER_STATUS_LABELS", () => {
  it("has a Persian label for every status", () => {
    for (const status of ALL_STATUSES) {
      expect(ORDER_STATUS_LABELS[status]).toBeTruthy();
      expect(typeof ORDER_STATUS_LABELS[status]).toBe("string");
    }
  });
});
