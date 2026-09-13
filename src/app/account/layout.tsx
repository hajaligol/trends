import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getCurrentUser, logoutAction } from "@/domains/auth/actions";

/**
 * Every route under `/account` is protected here, once, rather than each
 * page re-checking — real server-side auth (`getCurrentUser()` reads the
 * signed session cookie via NextAuth's `auth()`), not just hiding a link
 * in the UI, per TRENDS_PROJECT_CONTEXT.md §6 "protected `/account`
 * routes with real server-side ownership checks (not just hidden UI)".
 * Sub-pages (`/account/addresses`, etc.) additionally scope every
 * database query by `session.user.id` themselves — this layout only
 * proves *someone* is logged in, not that they own a specific resource.
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="py-[clamp(40px,7vw,80px)]">
      <Container className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <aside className="flex shrink-0 flex-col gap-1 lg:w-[220px]">
          <p className="mb-2 text-[0.85rem] text-text-secondary">{user.name ?? user.mobile}</p>
          <Link href="/account" className="rounded-md px-3 py-2 text-[0.92rem] text-ink hover:bg-ink/5">
            حساب کاربری
          </Link>
          <Link
            href="/account/addresses"
            className="rounded-md px-3 py-2 text-[0.92rem] text-ink hover:bg-ink/5"
          >
            آدرس‌ها
          </Link>
          <Link
            href="/account/orders"
            className="rounded-md px-3 py-2 text-[0.92rem] text-ink hover:bg-ink/5"
          >
            سفارش‌های من
          </Link>
          <Link
            href="/account/wishlist"
            className="rounded-md px-3 py-2 text-[0.92rem] text-ink hover:bg-ink/5"
          >
            علاقه‌مندی‌ها
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-right text-[0.92rem] text-red-600 hover:bg-red-50"
            >
              خروج از حساب کاربری
            </button>
          </form>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </Container>
    </main>
  );
}
