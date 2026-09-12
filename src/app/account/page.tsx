import type { Metadata } from "next";
import { getCurrentUser } from "@/domains/auth/actions";
import { findUserById } from "@/domains/auth/queries";
import { formatIranianMobileForDisplay } from "@/lib/utils/phone";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata: Metadata = {
  title: "حساب کاربری",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  // `getCurrentUser()` guarantees a session exists (enforced by the
  // parent layout), but the session/JWT payload only carries the small
  // set of fields attached in `src/lib/auth/config.ts`'s callbacks — this
  // page needs `createdAt`, so it re-reads the full row rather than
  // trusting the JWT for display-only account details.
  const sessionUser = await getCurrentUser();
  const user = sessionUser ? await findUserById(sessionUser.id) : null;
  if (!user) return null; // Layout already redirects if there's no session; defensive only.

  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 text-[1.4rem] font-bold">حساب کاربری</h1>
      <dl className="grid max-w-md grid-cols-[120px_1fr] gap-y-4 rounded-[var(--radius-lg)] border border-line bg-white p-6 text-[0.92rem]">
        <dt className="text-text-secondary">نام</dt>
        <dd>{user.fullName ?? "—"}</dd>

        <dt className="text-text-secondary">شماره موبایل</dt>
        <dd dir="ltr" className="text-right">
          {toPersianDigits(formatIranianMobileForDisplay(user.mobile))}
        </dd>

        <dt className="text-text-secondary">ایمیل</dt>
        <dd>{user.email ?? "—"}</dd>

        <dt className="text-text-secondary">عضویت از</dt>
        <dd>
          {toPersianDigits(
            new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(
              user.createdAt,
            ),
          )}
        </dd>
      </dl>
    </div>
  );
}
