"use client";

import { ToggleSwitch } from "@/components/admin/ui/ToggleSwitch";
import { toggleBrandActiveAction } from "@/domains/brands/actions";

export function BrandActiveToggle({ brandId, isActive }: { brandId: string; isActive: boolean }) {
  return (
    <ToggleSwitch
      checked={isActive}
      label="فعال بودن برند"
      onLabel="فعال"
      offLabel="غیرفعال"
      action={(next) => toggleBrandActiveAction(brandId, next)}
      successMessage={(next) => (next ? "برند فعال شد" : "برند غیرفعال شد")}
    />
  );
}
