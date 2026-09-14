import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { siteSettings } from "@/lib/db/schema";
import type { SiteSettings } from "@/lib/db/schema";

/**
 * `site_settings` is a genuine singleton (see that table's header
 * comment) — this fixed id is the only row that ever exists, read here
 * and nowhere else, so every caller shares one definition of "the"
 * settings row rather than each guessing/hardcoding the id string.
 */
export const SINGLETON_SETTINGS_ID = "default";

const DEFAULT_SETTINGS: Omit<SiteSettings, "id" | "updatedAt" | "updatedByUserId"> = {
  storeName: "ترندز",
  supportEmail: null,
  supportPhone: null,
  standardShippingFeeToman: 90_000,
  expressShippingFeeToman: 180_000,
  freeShippingThresholdToman: 2_000_000,
};

/**
 * Returns the settings row, creating it with defaults on first read if
 * it doesn't exist yet (a fresh install/migration never ran an explicit
 * "seed settings" step) — every caller (the admin settings page, and
 * `src/domains/shipping/methods.ts`) gets a real row back either way,
 * never `null`, so call sites don't need their own fallback branch.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const [existing] = await db.select().from(siteSettings).where(eq(siteSettings.id, SINGLETON_SETTINGS_ID)).limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(siteSettings)
    .values({ id: SINGLETON_SETTINGS_ID, ...DEFAULT_SETTINGS })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  // Lost a race with a concurrent first-read — re-select rather than error.
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, SINGLETON_SETTINGS_ID)).limit(1);
  if (!row) throw new Error("Failed to read or create site settings row");
  return row;
}

/**
 * Read-only payment-provider configuration status for the admin settings
 * page — reports which provider `PAYMENT_PROVIDER` currently names,
 * never any secret value, per CLAUDE_BUILD_INSTRUCTIONS.txt rule A.13/G
 * ("never expose secrets to the browser", "do not fabricate live payment
 * credentials"). There is nothing here for an admin to edit — changing
 * the actual provider requires editing environment configuration and
 * redeploying, which is the correct amount of friction for a decision
 * that involves real gateway credentials.
 */
export function getPaymentProviderStatus(): { configured: boolean; provider: string | null } {
  const provider = process.env.PAYMENT_PROVIDER?.trim() || null;
  return { configured: Boolean(provider), provider };
}
