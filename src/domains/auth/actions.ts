"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/lib/auth/config";
import { SITE_URL } from "@/lib/site-config";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { createUser, findUserByMobile, MobileAlreadyRegisteredError, updateUserPassword } from "@/domains/auth/queries";
import {
  consumePasswordResetToken,
  issuePasswordResetToken,
  verifyPasswordResetToken,
} from "@/domains/auth/reset-tokens";
import { sendPasswordResetLink } from "@/domains/auth/notifications";
import { mergeGuestCartIntoUserCart } from "@/domains/cart/merge";
import { readGuestCartId, clearGuestCartId } from "@/domains/cart/session";
import { checkIpRateLimit } from "@/lib/security/rate-limit";

/**
 * Server Actions for every auth mutation. Every one re-validates its
 * input with the shared Zod schemas from `src/lib/validation/auth.ts`
 * (rule A.9 — a Server Action being called from a form we wrote
 * ourselves is not automatically trustworthy input, per
 * CLAUDE_BUILD_INSTRUCTIONS.txt's "Server Actions" section: "Do not
 * treat 'server action' as automatically authorized" applies just as
 * much to *validated* as to *authorized*).
 *
 * Return shape: `{ error?: string; fieldErrors?: Record<string, string> }`
 * on failure — the calling form component (`useActionState`) renders
 * these. Success paths `redirect()` (registration/login land on
 * `/account`; logout lands on `/`), which throws internally in Next.js,
 * so there is no matching "success" return value to design around.
 */

export type ActionResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /**
   * Non-sensitive submitted values (mobile, name, email) echoed back on
   * failure so React 19's automatic form reset doesn't wipe what the
   * person typed. Passwords are never echoed.
   */
  values?: Record<string, string>;
} | void;

/**
 * Folds a guest cart (if any) into the just-signed-in user's cart —
 * called from both `registerAction` and `loginAction` right after
 * `signIn()` succeeds, before the `redirect()`. See
 * `src/domains/cart/merge.ts` for the merge semantics (quantities
 * summed, guest cart deleted). Always clears the guest cookie
 * afterward, even if there was nothing to merge, so a stale/empty guest
 * cart cookie never lingers past the point where the user has a real
 * account cart to use instead.
 */
async function mergeGuestCartOnSignIn(userId: string): Promise<void> {
  const guestCartId = await readGuestCartId();
  await mergeGuestCartIntoUserCart(guestCartId, userId);
  if (guestCartId) await clearGuestCartId();
}

function echoValues(formData: FormData, keys: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const raw = formData.get(key);
    if (typeof raw === "string") values[key] = raw.slice(0, 200);
  }
  return values;
}

function firstFieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function registerAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  // Rate-limited by IP, not by the submitted mobile number — a mobile-
  // keyed limit would let an attacker sidestep it by rotating numbers,
  // and would also let an attacker exhaust a *victim's* limit by
  // submitting their number repeatedly. See
  // `src/lib/security/rate-limit.ts`'s header comment for why an
  // in-process limiter (not Redis) is the right primitive here.
  const echoed = echoValues(formData, ["fullName", "mobile", "email"]);
  const rateLimited = await checkIpRateLimit("register", 5, 60 * 60 * 1000);
  if (rateLimited) return { error: rateLimited.error, values: echoed };

  const parsed = registerSchema.safeParse({
    mobile: formData.get("mobile"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.issues), values: echoed };
  }

  let newUser;
  try {
    newUser = await createUser({
      mobile: parsed.data.mobile,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      password: parsed.data.password,
    });
  } catch (error) {
    if (error instanceof MobileAlreadyRegisteredError) {
      return { fieldErrors: { mobile: error.message }, values: echoed };
    }
    throw error;
  }

  // Register immediately signs the new user in, same as a normal login —
  // credentials are known-good since we just created the row with them.
  await signIn("credentials", {
    mobile: parsed.data.mobile,
    password: parsed.data.password,
    redirect: false,
  });

  // A brand-new account can still have a guest cart worth keeping — the
  // person may have added items before deciding to create an account.
  await mergeGuestCartOnSignIn(newUser.id);

  redirect("/account");
}

export async function loginAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  // Credential-stuffing/brute-force slowdown — deliberately generous
  // (10 attempts / 5 minutes / IP) so a customer who mistypes their
  // password a few times is never locked out, while still bounding an
  // automated attempt loop. Keyed by IP, not by the submitted mobile
  // number, for the same reason `registerAction` is (see its comment).
  const echoed = echoValues(formData, ["mobile"]);
  const rateLimited = await checkIpRateLimit("login", 10, 5 * 60 * 1000);
  if (rateLimited) return { error: rateLimited.error, values: echoed };

  const parsed = loginSchema.safeParse({
    mobile: formData.get("mobile"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.issues), values: echoed };
  }

  try {
    await signIn("credentials", {
      mobile: parsed.data.mobile,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    // NextAuth throws `AuthError` (specifically `CredentialsSignin`) when
    // `authorize()` returns `null` — that's our "wrong mobile/password"
    // path. Never reveal *which* of the two was wrong (standard
    // enumeration-prevention practice), same message either way.
    if (error instanceof AuthError) {
      return { error: "شماره موبایل یا رمز عبور اشتباه است", values: echoed };
    }
    throw error;
  }

  // `signIn()` above already proved these credentials are correct; this
  // is just a read to get the user's id for the cart merge below, not a
  // second authorization check.
  const user = await findUserByMobile(parsed.data.mobile);
  if (user) await mergeGuestCartOnSignIn(user.id);

  redirect("/account");
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirect: false });
  redirect("/");
}

/**
 * Always returns the same generic success message regardless of whether
 * the mobile number is actually registered — otherwise this endpoint
 * would let anyone enumerate which mobile numbers have accounts.
 */
export async function requestPasswordResetAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const rateLimited = await checkIpRateLimit("forgot-password", 5, 60 * 60 * 1000);
  if (rateLimited) return { error: rateLimited.error };

  const parsed = forgotPasswordSchema.safeParse({ mobile: formData.get("mobile") });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.issues) };
  }

  const user = await findUserByMobile(parsed.data.mobile);
  if (user) {
    const rawToken = await issuePasswordResetToken(user.id);
    const resetUrl = `${SITE_URL}/reset-password/${rawToken}`;
    await sendPasswordResetLink({ mobile: user.mobile, resetUrl });
  }

  return undefined;
}

export async function resetPasswordAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  // A brute-force guess against a specific token is already extremely
  // unlikely to succeed (the token itself is a high-entropy random
  // value, only its SHA-256 hash is stored — see `reset-tokens.ts`), but
  // this bounds automated guessing attempts against this endpoint the
  // same way every other public auth action here is bounded.
  const rateLimited = await checkIpRateLimit("reset-password", 10, 60 * 60 * 1000);
  if (rateLimited) return { error: rateLimited.error };

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.issues) };
  }

  const verified = await verifyPasswordResetToken(parsed.data.token);
  if (!verified) {
    return { error: "لینک بازیابی رمز عبور نامعتبر یا منقضی شده است" };
  }

  await updateUserPassword(verified.userId, parsed.data.password);
  await consumePasswordResetToken(parsed.data.token);

  redirect("/login?reset=success");
}

/** Used by the protected `/account` layout to get the current session's
 * user, and by anything else that needs to check "who is logged in"
 * server-side. Thin re-export so call sites don't need to know this
 * comes from `next-auth`. */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
