"use client";

import { ToggleSwitch } from "@/components/admin/ui/ToggleSwitch";
import { toggleSubscriberActiveAction } from "@/domains/newsletter/admin-actions";

export function SubscriberActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  return (
    <ToggleSwitch
      checked={isActive}
      label="وضعیت اشتراک خبرنامه"
      onLabel="مشترک"
      offLabel="لغو اشتراک"
      action={(next) => toggleSubscriberActiveAction(id, next)}
      successMessage={(next) => (next ? "اشتراک فعال شد" : "اشتراک لغو شد")}
    />
  );
}
