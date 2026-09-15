"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { siteSettings } from "@/lib/db/schema";
import { siteSettingsSchema } from "@/lib/validation/admin";
import { isStaffOrAdmin, UNAUTHORIZED_ERROR, type ActionResult } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";
import { getSiteSettings, SINGLETON_SETTINGS_ID } from "@/domains/admin/settings-queries";

export async function updateSiteSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = siteSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstField = Object.values(flat.fieldErrors).find((messages) => messages && messages.length > 0);
    return { ok: false, error: firstField?.[0] ?? "اطلاعات وارد شده معتبر نیست" };
  }

  await getSiteSettings(); // ensure the singleton row exists before updating it
  await db
    .update(siteSettings)
    .set({ ...parsed.data, updatedAt: new Date(), updatedByUserId: session.user.id })
    .where(eq(siteSettings.id, SINGLETON_SETTINGS_ID));

  await recordAuditLog(session.user, "settings.update", "site_settings", SINGLETON_SETTINGS_ID, parsed.data);

  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
  // Phase 13 fix: `/shipping-policy` and `/contact` both read live
  // `site_settings` values (shipping fees/threshold, support email/
  // phone — see their own page files) via a plain Drizzle query, which
  // gives Next.js App Router no signal that the page is dynamic (unlike
  // a `fetch()` call, which Next can see and control the cache
  // semantics of) — so both pages are statically prerendered at build
  // time and would otherwise keep showing whatever numbers were true at
  // the last build indefinitely, defeating the whole point of reading
  // them "live" from the database. Missing this was a real bug this
  // phase's audit caught, not a hypothetical.
  revalidatePath("/shipping-policy");
  revalidatePath("/contact");
  return { ok: true };
}
