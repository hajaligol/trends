"use server";

import { db } from "@/lib/db/client";
import { newsletterSubscribers } from "@/lib/db/schema";
import { newsletterSubscribeSchema } from "@/lib/validation/storefront";
import type { ActionResult } from "@/domains/auth/roles";

/**
 * Wires the previously-presentational Footer newsletter form
 * (`src/components/layout/Footer.tsx`, inert since Phase 2) to real
 * persistence — TRENDS_PROJECT_CONTEXT.md §6 "Newsletter" ("real
 * subscription"), CLAUDE_BUILD_INSTRUCTIONS.txt Phase 12 ("newsletter
 * real persistence"). No authentication required — a newsletter signup
 * is deliberately open to any visitor, unlike reviews.
 *
 * Re-subscribing with an email that already unsubscribed
 * (`isActive: false`) re-activates the same row instead of erroring or
 * creating a duplicate — `newsletterSubscribers.email`'s unique index
 * is what makes `onConflictDoUpdate` the correct, race-safe primitive
 * here (rule F.3), not a read-then-write check.
 */
export async function subscribeNewsletterAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = newsletterSubscribeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "ایمیل معتبر نیست" };

  await db
    .insert(newsletterSubscribers)
    .values({ email: parsed.data.email })
    .onConflictDoUpdate({
      target: newsletterSubscribers.email,
      set: { isActive: true, unsubscribedAt: null },
    });

  return { ok: true };
}
