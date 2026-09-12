/**
 * Notification adapter boundary for account-related messages (password
 * reset link today; order/shipping notifications are Phase 10/12).
 *
 * TRENDS_PROJECT_CONTEXT.md §6 "Notifications" asks for "an extensible
 * notification layer" with "email/SMS provider integrations ... behind
 * adapters" — this is that boundary. No real SMS/email provider is
 * configured in this phase (`SMS_PROVIDER_API_KEY` in `.env.example` is
 * blank), so per rule A.17 ("do not fabricate live payment credentials
 * or claim a payment integration is live when it is not" — the same
 * principle applies to any provider claim, not payments specifically)
 * this adapter does **not** pretend to send a real SMS.
 *
 * Instead it logs the reset link to the server console, clearly labeled,
 * so password reset is fully testable end-to-end in dev/this sandbox
 * without a real provider. Swap this function's body for a real
 * SMS/email provider call once `SMS_PROVIDER_API_KEY` (or an email
 * provider key) is actually configured — the call site
 * (`src/domains/auth/actions.ts`) doesn't need to change.
 */
export async function sendPasswordResetLink(params: { mobile: string; resetUrl: string }): Promise<void> {
  console.log(
    `[auth/notifications] SMS_PROVIDER_API_KEY is not configured — this is NOT a real SMS. ` +
      `Password reset link for ${params.mobile}: ${params.resetUrl}`,
  );
}
