import { describe, expect, it } from "vitest";
import { isAdmin, isStaffOrAdmin } from "@/domains/auth/roles";

describe("isStaffOrAdmin", () => {
  it("returns true for staff and admin", () => {
    expect(isStaffOrAdmin("staff")).toBe(true);
    expect(isStaffOrAdmin("admin")).toBe(true);
  });

  it("returns false for customer and unset roles", () => {
    expect(isStaffOrAdmin("customer")).toBe(false);
    expect(isStaffOrAdmin(undefined)).toBe(false);
    expect(isStaffOrAdmin(null)).toBe(false);
  });

  it("returns false for an unrecognized/tampered role string (never fails open)", () => {
    expect(isStaffOrAdmin("Admin")).toBe(false);
    expect(isStaffOrAdmin("ADMIN")).toBe(false);
    expect(isStaffOrAdmin("superadmin")).toBe(false);
    expect(isStaffOrAdmin("")).toBe(false);
  });
});

describe("isAdmin", () => {
  it("returns true only for admin", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("staff")).toBe(false);
    expect(isAdmin("customer")).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it("every admin is also staff-or-admin (isAdmin is strictly narrower)", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isStaffOrAdmin("admin")).toBe(true);
  });
});
