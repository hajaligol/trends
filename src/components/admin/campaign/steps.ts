/**
 * Per-stage checks for the staged campaign form. A UX gate only — the
 * `saveCampaignAction` Server Action re-validates everything.
 */

export const CAMPAIGN_STEPS = [
  { id: "basics", title: "نام و نوع" },
  { id: "discount", title: "تنظیمات تخفیف" },
  { id: "scope", title: "محصولات مشمول" },
  { id: "schedule", title: "زمان‌بندی و قوانین" },
  { id: "home", title: "صفحه اصلی" },
  { id: "review", title: "مرور و ایجاد" },
] as const;

export type CampaignStepId = (typeof CAMPAIGN_STEPS)[number]["id"];

export type CampaignStepValues = {
  name: string;
  description: string;
  /** `null` when the discount settings parse; otherwise the parser's message. */
  configError: string | null;
  hasTargets: boolean;
  startsAt: string;
  endsAt: string;
  showCountdown: boolean;
  homePlacement: "none" | "hero" | "banner";
  homeImageUrl: string;
};

export function validateCampaignStep(step: CampaignStepId, v: CampaignStepValues): string | null {
  switch (step) {
    case "basics":
      if (v.name.trim() === "") return "نام کمپین را وارد کنید.";
      if (v.name.trim().length > 60) return "نام کمپین حداکثر ۶۰ نویسه می‌تواند باشد.";
      if (v.description.trim().length > 160) return "توضیح کوتاه حداکثر ۱۶۰ نویسه می‌تواند باشد.";
      return null;
    case "discount":
      return v.configError ? `تنظیمات تخفیف کامل نیست: ${v.configError}` : null;
    case "scope":
      return v.hasTargets ? null : "کل فروشگاه را انتخاب کنید یا دست‌کم یک برند، دسته‌بندی یا محصول مشخص کنید.";
    case "schedule":
      // `datetime-local` values (YYYY-MM-DDTHH:mm) sort lexicographically.
      if (v.startsAt && v.endsAt && v.endsAt <= v.startsAt) return "زمان پایان باید بعد از زمان شروع باشد.";
      if (v.showCountdown && !v.endsAt) return "برای نمایش شمارش معکوس، زمان پایان را مشخص کنید.";
      return null;
    case "home":
      return v.homePlacement !== "none" && !v.homeImageUrl ? "برای نمایش در صفحه اصلی یک تصویر انتخاب کنید." : null;
    case "review":
      return null;
  }
}

/** First failing stage (index + message), or null when every stage passes. */
export function firstInvalidCampaignStep(v: CampaignStepValues): { index: number; error: string } | null {
  for (let index = 0; index < CAMPAIGN_STEPS.length; index += 1) {
    const error = validateCampaignStep(CAMPAIGN_STEPS[index]?.id ?? "review", v);
    if (error) return { index, error };
  }
  return null;
}
