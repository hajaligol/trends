import type { CampaignKind } from "@/lib/db/schema/campaigns";
import { normalizeSearchText, textIncludes, type RawParam } from "@/lib/utils/admin-filters";
import type { AdminCampaignListItem } from "./admin-queries";
import { KIND_META } from "./labels";
import { campaignStatus, type CampaignStatus } from "./status";

/**
 * In-memory filter for `/admin/campaigns`. The campaign list is small and
 * operator-curated (tens of rows), and the headline "status" is *derived*
 * from the flag + time window rather than stored, so filtering the loaded
 * list keeps one definition of "live/ended/…" (`campaignStatus`) instead of
 * re-implementing it in SQL.
 */

export type CampaignHomeFilter = "none" | "hero" | "banner";

export type CampaignListFilter = {
  q?: string;
  status?: CampaignStatus;
  kind?: CampaignKind;
  home?: CampaignHomeFilter;
};

const STATUSES = ["live", "scheduled", "ended", "paused"] as const satisfies readonly CampaignStatus[];
const HOMES = ["none", "hero", "banner"] as const satisfies readonly CampaignHomeFilter[];

export function parseCampaignFilter(raw: { q?: RawParam; status?: RawParam; kind?: RawParam; home?: RawParam }): CampaignListFilter {
  const pick = <T extends string>(value: RawParam, allowed: readonly T[]): T | undefined => {
    const v = Array.isArray(value) ? value[0] : value;
    return allowed.find((item) => item === v);
  };
  return {
    q: normalizeSearchText(raw.q),
    status: pick(raw.status, STATUSES),
    kind: pick(raw.kind, Object.keys(KIND_META) as CampaignKind[]),
    home: pick(raw.home, HOMES),
  };
}

export function isCampaignFilterActive(filter: CampaignListFilter): boolean {
  return Boolean(filter.q || filter.status || filter.kind || filter.home);
}

export function campaignMatchesSearch(item: AdminCampaignListItem, q: string): boolean {
  return (
    textIncludes(item.row.name, q) ||
    textIncludes(item.row.slug, q) ||
    textIncludes(item.row.description, q) ||
    textIncludes(item.row.homeTitle, q) ||
    textIncludes(KIND_META[item.row.kind].title, q) ||
    textIncludes(item.summary, q)
  );
}

/** Every filter except `status` — used for the per-status tab counts. */
export function filterCampaignsIgnoringStatus(items: AdminCampaignListItem[], filter: CampaignListFilter): AdminCampaignListItem[] {
  return items.filter((item) => {
    if (filter.kind && item.row.kind !== filter.kind) return false;
    if (filter.home && item.row.homePlacement !== filter.home) return false;
    if (filter.q && !campaignMatchesSearch(item, filter.q)) return false;
    return true;
  });
}

export function filterCampaigns(items: AdminCampaignListItem[], filter: CampaignListFilter, now: Date = new Date()): AdminCampaignListItem[] {
  const base = filterCampaignsIgnoringStatus(items, filter);
  return filter.status ? base.filter((item) => campaignStatus(item.row, now) === filter.status) : base;
}

export function countCampaignsByStatus(items: AdminCampaignListItem[], now: Date = new Date()): Record<CampaignStatus, number> {
  const counts: Record<CampaignStatus, number> = { live: 0, scheduled: 0, ended: 0, paused: 0 };
  for (const item of items) counts[campaignStatus(item.row, now)] += 1;
  return counts;
}
