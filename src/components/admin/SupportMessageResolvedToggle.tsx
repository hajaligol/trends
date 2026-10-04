"use client";

import { ToggleSwitch } from "@/components/admin/ui/ToggleSwitch";
import { toggleSupportMessageResolvedAction } from "@/domains/support/admin-actions";

export function SupportMessageResolvedToggle({ id, isResolved }: { id: string; isResolved: boolean }) {
  return (
    <ToggleSwitch
      checked={isResolved}
      label="حل‌شده بودن پیام"
      onLabel="حل شده"
      offLabel="بدون پاسخ"
      action={(next) => toggleSupportMessageResolvedAction(id, next)}
      successMessage={(next) => (next ? "پیام به‌عنوان حل‌شده علامت خورد" : "پیام دوباره باز شد")}
    />
  );
}
