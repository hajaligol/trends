"use server";

import { db } from "@/lib/db/client";
import { supportMessages } from "@/lib/db/schema";
import { contactSchema } from "@/lib/validation/storefront";
import { auth } from "@/lib/auth/config";
import type { ActionResult } from "@/domains/auth/roles";
import { notifyEvent } from "@/domains/notifications/provider";
import { checkIpRateLimit } from "@/lib/security/rate-limit";

/**
 * The `/contact` page's Server Action — real persistence, per
 * CLAUDE_BUILD_INSTRUCTIONS.txt Phase 12 ("support/contact form ... not
 * a fake form that silently does nothing on submit", rule G). No
 * authentication required (a support request shouldn't require an
 * account), but attributes `userId` when the submitter happens to be
 * signed in, purely for admin-triage convenience — see
 * `lib/db/schema/support-messages.ts`'s header comment.
 *
 * `notifyEvent`'s `support_message_received` branch logs the new
 * submission to the server console (store-operator-facing, the same
 * honest "no real email/SMS provider configured" posture every other
 * notification in this codebase uses) — the actual durable record is
 * always the inserted row itself, which `/admin/support` reads for real.
 */
export async function submitSupportMessageAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  // No auth required (by design), so — like the newsletter form — this
  // is reachable by any anonymous visitor; bound it by IP against spam.
  const rateLimited = await checkIpRateLimit("support-message", 5, 60 * 60 * 1000);
  if (rateLimited) return { ok: false, error: rateLimited.error };

  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstField = Object.values(flat.fieldErrors).find((messages) => messages && messages.length > 0);
    return { ok: false, error: firstField?.[0] ?? "اطلاعات وارد شده معتبر نیست" };
  }

  const session = await auth();

  await db.insert(supportMessages).values({
    name: parsed.data.name,
    email: parsed.data.email,
    mobile: parsed.data.mobile,
    subject: parsed.data.subject,
    message: parsed.data.message,
    userId: session?.user?.id ?? null,
  });

  await notifyEvent({ type: "support_message_received", recipient: "store", subject: parsed.data.subject, fromEmail: parsed.data.email });

  return { ok: true };
}
