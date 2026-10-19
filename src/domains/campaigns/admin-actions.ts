"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { campaignTargets, campaigns } from "@/lib/db/schema";
import { isStaffOrAdmin, UNAUTHORIZED_ERROR, type ActionResult } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";
import { campaignInputSchema, campaignPreviewSchema, firstIssue, type CampaignInput } from "./admin-schema";
import { parseCampaignConfig } from "./config";
import { generateCampaignSlug } from "./slug";
import { previewCampaignCoverage, type CampaignPreview } from "./admin-queries";

/**
 * Admin sale-campaign actions. Like every admin action each one re-checks
 * the session role itself, validates the payload from scratch with Zod and
 * writes an audit-log entry. A campaign change affects prices customers see,
 * so the whole storefront layout is revalidated afterwards.
 */

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return null;
  return session.user;
}

function revalidateStorefront() {
  revalidatePath("/admin/campaigns");
  revalidatePath("/", "layout");
}

function parsePayload(payload: unknown) {
  if (typeof payload !== "string" || payload.length > 200_000) return { ok: false as const, error: "اطلاعات وارد شده معتبر نیست" };
  let json: unknown;
  try {
    json = JSON.parse(payload);
  } catch {
    return { ok: false as const, error: "اطلاعات وارد شده معتبر نیست" };
  }
  return { ok: true as const, json };
}

function targetRows(campaignId: string, input: Pick<CampaignInput, "appliesToAll" | "brandIds" | "categoryIds" | "productIds" | "excludedProductIds">) {
  const includes = input.appliesToAll
    ? []
    : [
        ...input.brandIds.map((brandId) => ({ campaignId, brandId, isExclusion: false })),
        ...input.categoryIds.map((categoryId) => ({ campaignId, categoryId, isExclusion: false })),
        ...input.productIds.map((productId) => ({ campaignId, productId, isExclusion: false })),
      ];
  const excludes = input.excludedProductIds
    // A product that is explicitly included AND excluded is just excluded.
    .map((productId) => ({ campaignId, productId, isExclusion: true }));
  return [...includes.filter((row) => !("productId" in row) || !input.excludedProductIds.includes(row.productId as string)), ...excludes];
}

function mapDbError(error: unknown): string {
  const code = (error as { code?: string; cause?: { code?: string } } | null)?.code ?? (error as { cause?: { code?: string } } | null)?.cause?.code;
  if (code === "23505") return "نشانی صفحه کمپین تکراری شد؛ دوباره ذخیره کنید";
  if (code === "23503") return "برخی برندها، دسته‌بندی‌ها یا محصولات انتخاب‌شده دیگر وجود ندارند؛ صفحه را تازه کنید";
  console.error("campaign action failed", error);
  return "خطا در ذخیره کمپین؛ دوباره تلاش کنید";
}

export async function saveCampaignAction(payload: string, id: string | null): Promise<ActionResult<{ id: string }>> {
  const user = await requireStaff();
  if (!user) return { ok: false, error: UNAUTHORIZED_ERROR };

  const raw = parsePayload(payload);
  if (!raw.ok) return raw;
  const parsed = campaignInputSchema.safeParse(raw.json);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const input = parsed.data;
  if (id !== null && !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "کمپین یافت نشد" };

  const values = {
    name: input.name,
    description: input.description,
    kind: input.definition.kind,
    config: input.definition.config,
    appliesToAll: input.appliesToAll,
    stackable: input.stackable,
    showCountdown: input.showCountdown,
    isActive: input.isActive,
    // Homepage advertising: the image only matters while a placement is chosen.
    homePlacement: input.homePlacement,
    homeImageUrl: input.homePlacement === "none" ? null : input.homeImageUrl,
    heroImageUrl: input.heroImageUrl,
    homeBannerTone: input.homeBannerTone,
    homeTitle: input.homePlacement === "banner" ? input.homeTitle : null,
    homeDescription: input.homePlacement === "banner" ? input.homeDescription : null,
    homeCtaLabel: input.homePlacement === "banner" ? input.homeCtaLabel : null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  };

  try {
    const savedId = await db.transaction(async (tx) => {
      let campaignId: string;
      if (id === null) {
        const slug = await generateCampaignSlug(tx, input.name);
        const [created] = await tx.insert(campaigns).values({ ...values, slug }).returning({ id: campaigns.id });
        campaignId = created!.id;
      } else {
        const updated = await tx
          .update(campaigns)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(campaigns.id, id))
          .returning({ id: campaigns.id });
        if (updated.length === 0) throw new Error("CAMPAIGN_NOT_FOUND");
        campaignId = id;
        await tx.delete(campaignTargets).where(eq(campaignTargets.campaignId, id));
      }
      const rows = targetRows(campaignId, input);
      if (rows.length > 0) await tx.insert(campaignTargets).values(rows);
      return campaignId;
    });

    await recordAuditLog(user, id === null ? "campaign.create" : "campaign.update", "campaign", savedId, {
      name: input.name,
      kind: input.definition.kind,
      config: input.definition.config,
      appliesToAll: input.appliesToAll,
      brands: input.brandIds.length,
      categories: input.categoryIds.length,
      products: input.productIds.length,
      excludedProducts: input.excludedProductIds.length,
      isActive: input.isActive,
      homePlacement: input.homePlacement,
    });
    revalidateStorefront();
    revalidatePath(`/admin/campaigns/${savedId}`);
    return { ok: true, data: { id: savedId } };
  } catch (error) {
    if (error instanceof Error && error.message === "CAMPAIGN_NOT_FOUND") return { ok: false, error: "کمپین یافت نشد" };
    return { ok: false, error: mapDbError(error) };
  }
}

export async function toggleCampaignActiveAction(id: string, nextActive: boolean): Promise<ActionResult> {
  const user = await requireStaff();
  if (!user) return { ok: false, error: UNAUTHORIZED_ERROR };
  if (typeof nextActive !== "boolean") return { ok: false, error: "اطلاعات وارد شده معتبر نیست" };
  const updated = await db
    .update(campaigns)
    .set({ isActive: nextActive, updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning({ id: campaigns.id });
  if (updated.length === 0) return { ok: false, error: "کمپین یافت نشد" };
  await recordAuditLog(user, "campaign.toggle_active", "campaign", id, { isActive: nextActive });
  revalidateStorefront();
  return { ok: true };
}

/** Copies a campaign (targets included) as a PAUSED draft, so the operator
 * can adjust and launch it without rebuilding the same scope. */
export async function duplicateCampaignAction(id: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireStaff();
  if (!user) return { ok: false, error: UNAUTHORIZED_ERROR };
  try {
    const newId = await db.transaction(async (tx) => {
      const [source] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
      if (!source) throw new Error("CAMPAIGN_NOT_FOUND");
      const targets = await tx.select().from(campaignTargets).where(eq(campaignTargets.campaignId, id));
      const [copy] = await tx
        .insert(campaigns)
        .values({
          name: `${source.name} (کپی)`.slice(0, 60),
          slug: await generateCampaignSlug(tx, `${source.name} کپی`),
          description: source.description,
          kind: source.kind,
          config: source.config,
          appliesToAll: source.appliesToAll,
          stackable: source.stackable,
          showCountdown: source.showCountdown,
          isActive: false,
          homePlacement: source.homePlacement,
          homeImageUrl: source.homeImageUrl,
          heroImageUrl: source.heroImageUrl,
          homeBannerTone: source.homeBannerTone,
          homeTitle: source.homeTitle,
          homeDescription: source.homeDescription,
          homeCtaLabel: source.homeCtaLabel,
          startsAt: null,
          endsAt: null,
        })
        .returning({ id: campaigns.id });
      if (targets.length > 0) {
        await tx.insert(campaignTargets).values(
          targets.map((t) => ({
            campaignId: copy!.id,
            brandId: t.brandId,
            categoryId: t.categoryId,
            productId: t.productId,
            isExclusion: t.isExclusion,
          })),
        );
      }
      return copy!.id;
    });
    await recordAuditLog(user, "campaign.duplicate", "campaign", newId, { sourceId: id });
    revalidateStorefront();
    return { ok: true, data: { id: newId } };
  } catch (error) {
    if (error instanceof Error && error.message === "CAMPAIGN_NOT_FOUND") return { ok: false, error: "کمپین یافت نشد" };
    return { ok: false, error: mapDbError(error) };
  }
}

/** Past orders keep their discount snapshots (the link to the campaign just becomes empty). */
export async function deleteCampaignAction(id: string): Promise<ActionResult> {
  const user = await requireStaff();
  if (!user) return { ok: false, error: UNAUTHORIZED_ERROR };
  const deleted = await db.delete(campaigns).where(eq(campaigns.id, id)).returning({ id: campaigns.id, name: campaigns.name });
  if (deleted.length === 0) return { ok: false, error: "کمپین یافت نشد" };
  await recordAuditLog(user, "campaign.delete", "campaign", id, { name: deleted[0]!.name });
  revalidateStorefront();
  return { ok: true };
}

export async function previewCampaignAction(payload: string): Promise<ActionResult<CampaignPreview>> {
  const user = await requireStaff();
  if (!user) return { ok: false, error: UNAUTHORIZED_ERROR };
  const raw = parsePayload(payload);
  if (!raw.ok) return raw;
  const parsed = campaignPreviewSchema.safeParse(raw.json);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const config = parseCampaignConfig(parsed.data.kind, parsed.data.config);
  if (!config.ok) return { ok: false, error: config.error };
  if (!parsed.data.appliesToAll && parsed.data.brandIds.length + parsed.data.categoryIds.length + parsed.data.productIds.length === 0) {
    return { ok: false, error: "برند، دسته‌بندی یا محصولی انتخاب نشده است" };
  }
  return { ok: true, data: await previewCampaignCoverage(parsed.data, config.definition) };
}
