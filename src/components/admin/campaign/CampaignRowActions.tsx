"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/feedback/ToastProvider";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ToggleSwitch } from "@/components/admin/ui/ToggleSwitch";
import { deleteCampaignAction, duplicateCampaignAction, toggleCampaignActiveAction } from "@/domains/campaigns/admin-actions";
import { adminButton } from "@/components/admin/ui/layout";

export function CampaignActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  return (
    <ToggleSwitch
      checked={isActive}
      label="فعال بودن کمپین"
      onLabel="فعال"
      offLabel="متوقف"
      action={(next) => toggleCampaignActiveAction(id, next)}
      successMessage={(next) => (next ? "کمپین فعال شد" : "کمپین متوقف شد")}
    />
  );
}

export function DuplicateCampaignButton({ id }: { id: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={adminButton("secondary", "sm")}
      onClick={() =>
        startTransition(async () => {
          const result = await duplicateCampaignAction(id);
          if (!result.ok) return showToast(result.error);
          showToast("کپی به‌صورت متوقف ساخته شد");
          router.push(`/admin/campaigns/${result.data.id}`);
        })
      }
    >
      {pending ? "..." : "کپی"}
    </button>
  );
}

export function DeleteCampaignButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmButton
      label="حذف"
      trigger="text"
      title="حذف کمپین"
      confirmMessage={`کمپین «${name}» حذف شود؟ سفارش‌های قبلی که از این کمپین تخفیف گرفته‌اند تغییری نمی‌کنند. اگر فقط می‌خواهید متوقف شود، کلید «فعال» را خاموش کنید.`}
      action={() => deleteCampaignAction(id)}
      successMessage="کمپین حذف شد"
    />
  );
}
