import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AccountNav } from "@/components/account/AccountNav";
import { DashboardLogoutIcon, DashboardUserIcon } from "@/components/ui/dashboard-icons";
import { getCurrentUser, logoutAction } from "@/domains/auth/actions";
import { formatIranianMobileForDisplay } from "@/lib/utils/phone";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/**
 * Every route under `/account` is protected here, once, rather than each
 * page re-checking — real server-side auth (`getCurrentUser()` reads the
 * signed session cookie via NextAuth's `auth()`), not just hiding a link
 * in the UI, per TRENDS_PROJECT_CONTEXT.md §6 "protected `/account`
 * routes with real server-side ownership checks (not just hidden UI)".
 * Sub-pages (`/account/addresses`, etc.) additionally scope every
 * database query by `session.user.id` themselves — this layout only
 * proves *someone* is logged in, not that they own a specific resource.
 *
 * The visual shell is a dashboard: a profile card + navigation on one
 * side (a scrollable pill row on mobile) and the page content beside it.
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const initial = user.name ? Array.from(user.name.trim())[0] : null;

  return (
    <main className="py-[clamp(28px,5vw,64px)]">
      <Container className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <aside className="shrink-0 lg:sticky lg:top-6 lg:w-[290px]">
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-white shadow-[0_18px_40px_-26px_rgba(24,38,48,0.35)]">
            <div className="flex items-center gap-3.5 border-b border-line bg-gradient-to-br from-[#f7f0fc] to-[#ede1f7] p-4 lg:p-5">
              <span
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-[1.4rem] font-bold text-brand shadow-[0_8px_20px_-10px_rgba(91,15,165,0.6)] ring-1 ring-brand/15"
              >
                {initial ?? <DashboardUserIcon className="h-7 w-7 text-ink" />}
              </span>
              <div className="min-w-0">
                <p className="m-0 truncate text-[1rem] font-bold">{user.name ?? "کاربر عزیز"}</p>
                {user.mobile && (
                  <p dir="ltr" className="m-0 mt-0.5 truncate text-right text-[0.82rem] text-text-secondary">
                    {toPersianDigits(formatIranianMobileForDisplay(user.mobile))}
                  </p>
                )}
              </div>
            </div>

            <AccountNav>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-start text-[0.92rem] text-red-600 transition-colors duration-200 hover:bg-red-50"
                >
                  <DashboardLogoutIcon className="h-[22px] w-[22px] shrink-0 text-ink" aria-hidden="true" />
                  خروج از حساب کاربری
                </button>
              </form>
            </AccountNav>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </Container>
    </main>
  );
}
