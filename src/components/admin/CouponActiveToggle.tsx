"use client";

import { ToggleSwitch } from "@/components/admin/ui/ToggleSwitch";
import { toggleCouponActiveAction } from "@/domains/promotions/admin-actions";

export function CouponActiveToggle({ couponId, isActive }: { couponId: string; isActive: boolean }) {
  return (
    <ToggleSwitch
      checked={isActive}
      label="فعال بودن کد تخفیف"
      onLabel="فعال"
      offLabel="غیرفعال"
      action={(next) => toggleCouponActiveAction(couponId, next)}
      successMessage={(next) => (next ? "کد تخفیف فعال شد" : "کد تخفیف غیرفعال شد")}
    />
  );
}
