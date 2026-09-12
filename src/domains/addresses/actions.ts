"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { addressSchema } from "@/lib/validation/auth";
import {
  createAddressForUser,
  deleteAddressForUser,
  updateAddressForUser,
} from "@/domains/addresses/queries";
import type { ActionResult } from "@/domains/auth/actions";

/**
 * Every action here re-checks `auth()` itself rather than trusting a
 * `userId` passed from the client, and every query call in
 * `src/domains/addresses/queries.ts` is scoped by that server-derived
 * `userId` — this is what makes "Claude cannot edit another user's
 * address by guessing an ID" actually true, not just assumed from the
 * UI never offering a way to do it.
 */

function firstFieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function parseAddressForm(formData: FormData) {
  return addressSchema.safeParse({
    recipientName: formData.get("recipientName"),
    recipientMobile: formData.get("recipientMobile"),
    province: formData.get("province"),
    city: formData.get("city"),
    addressLine: formData.get("addressLine"),
    postalCode: formData.get("postalCode"),
    plaqueUnitDetails: formData.get("plaqueUnitDetails"),
    deliveryNotes: formData.get("deliveryNotes"),
    isDefault: formData.get("isDefault") === "on",
  });
}

export async function createAddressAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "برای افزودن آدرس ابتدا وارد شوید" };

  const parsed = parseAddressForm(formData);
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.issues) };

  await createAddressForUser(session.user.id, parsed.data);
  revalidatePath("/account/addresses");
  return undefined;
}

export async function updateAddressAction(
  addressId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "برای ویرایش آدرس ابتدا وارد شوید" };

  const parsed = parseAddressForm(formData);
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.issues) };

  const updated = await updateAddressForUser(addressId, session.user.id, parsed.data);
  if (!updated) return { error: "این آدرس یافت نشد" };

  revalidatePath("/account/addresses");
  return undefined;
}

export async function deleteAddressAction(addressId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  await deleteAddressForUser(addressId, session.user.id);
  revalidatePath("/account/addresses");
}
