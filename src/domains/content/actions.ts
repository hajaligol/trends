"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { heroSlides, homeCategoryTiles, promoBanners } from "@/lib/db/schema";
import { isHomeCategoryTileKey } from "@/domains/content/home-category-tiles";
import { heroSlideSchema, promoBannerSchema } from "@/lib/validation/admin";
import { isStaffOrAdmin, UNAUTHORIZED_ERROR, type ActionResult } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  const flat = error.flatten();
  const firstField = Object.values(flat.fieldErrors).find((messages) => messages && messages.length > 0);
  return firstField?.[0] ?? "اطلاعات وارد شده معتبر نیست";
}

// ---------------------------------------------------------------------
// Hero slides
// ---------------------------------------------------------------------

export async function createHeroSlideAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = heroSlideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  const [created] = await db.insert(heroSlides).values(parsed.data).returning({ id: heroSlides.id });
  await recordAuditLog(session.user, "hero_slide.create", "hero_slide", created?.id ?? null, parsed.data);

  revalidatePath("/admin/content");
  revalidatePath("/");
  return { ok: true };
}

export async function updateHeroSlideAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "اسلاید یافت نشد" };

  const parsed = heroSlideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  await db.update(heroSlides).set({ ...parsed.data, updatedAt: new Date() }).where(eq(heroSlides.id, id));
  await recordAuditLog(session.user, "hero_slide.update", "hero_slide", id, parsed.data);

  revalidatePath("/admin/content");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteHeroSlideAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  await db.delete(heroSlides).where(eq(heroSlides.id, id));
  await recordAuditLog(session.user, "hero_slide.delete", "hero_slide", id);

  revalidatePath("/admin/content");
  revalidatePath("/");
  return { ok: true };
}

// ---------------------------------------------------------------------
// Promo banners
// ---------------------------------------------------------------------

export async function createPromoBannerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = promoBannerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  const [created] = await db.insert(promoBanners).values(parsed.data).returning({ id: promoBanners.id });
  await recordAuditLog(session.user, "promo_banner.create", "promo_banner", created?.id ?? null, parsed.data);

  revalidatePath("/admin/content");
  revalidatePath("/");
  return { ok: true };
}

export async function updatePromoBannerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "بنر یافت نشد" };

  const parsed = promoBannerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  await db.update(promoBanners).set({ ...parsed.data, updatedAt: new Date() }).where(eq(promoBanners.id, id));
  await recordAuditLog(session.user, "promo_banner.update", "promo_banner", id, parsed.data);

  revalidatePath("/admin/content");
  revalidatePath("/");
  return { ok: true };
}

export async function deletePromoBannerAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  await db.delete(promoBanners).where(eq(promoBanners.id, id));
  await recordAuditLog(session.user, "promo_banner.delete", "promo_banner", id);

  revalidatePath("/admin/content");
  revalidatePath("/");
  return { ok: true };
}

// ---------------------------------------------------------------------
// Homepage category squares
// ---------------------------------------------------------------------

/** Sets (or, with an empty `imageUrl`, clears) the picture of one of the
 * six fixed homepage category squares. */
export async function saveHomeCategoryTileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const tileKey = String(formData.get("tileKey") ?? "");
  if (!isHomeCategoryTileKey(tileKey)) return { ok: false, error: "دسته‌بندی یافت نشد" };

  const imageUrl = String(formData.get("imageUrl") ?? "").trim().slice(0, 2000) || null;

  await db
    .insert(homeCategoryTiles)
    .values({ tileKey, imageUrl })
    .onConflictDoUpdate({ target: homeCategoryTiles.tileKey, set: { imageUrl, updatedAt: new Date() } });
  await recordAuditLog(session.user, "home_category_tile.update", "home_category_tile", null, { tileKey, imageUrl });

  revalidatePath("/admin/content");
  revalidatePath("/");
  return { ok: true };
}
