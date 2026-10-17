export type CampaignStatus = "live" | "scheduled" | "ended" | "paused";

/** Operator-facing state of a campaign, derived from its flag and window. */
export function campaignStatus(
  row: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date = new Date(),
): CampaignStatus {
  if (!row.isActive) return "paused";
  if (row.endsAt && row.endsAt <= now) return "ended";
  if (row.startsAt && row.startsAt > now) return "scheduled";
  return "live";
}

export const STATUS_LABEL: Record<CampaignStatus, string> = {
  live: "در حال اجرا",
  scheduled: "زمان‌بندی‌شده",
  ended: "پایان‌یافته",
  paused: "متوقف",
};
