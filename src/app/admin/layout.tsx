import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getCurrentUser } from "@/domains/auth/actions";

/**
 * Every route under `/admin` is gated here, once — real server-side
 * `session.user.role` checks, not merely a link nowhere in the
 * customer-facing nav points at (CLAUDE_BUILD_INSTRUCTIONS.txt §7
 * "Admin must not rely on hidden UI alone for authorization").
 *
 * `notFound()` rather than a redirect for a signed-in *non-staff* user —
 * same reasoning `/order/[orderNumber]` already uses for cross-user
 * order access: a plain 404 doesn't confirm to a curious customer that
 * `/admin` is even a real, protected area, vs. a redirect to `/login`
 * (which fires for a genuinely signed-out visitor) that would.
 *
 * Scope note: this is intentionally a minimal shell (just "Orders" for
 * now) — see `src/domains/orders/admin-actions.ts`'s header comment.
 * Phase 11 builds out the real admin dashboard/nav; this exists only so
 * Phase 10's fulfillment work has *somewhere* authorized to live.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "staff") notFound();

  return (
    <main className="py-[clamp(32px,6vw,64px)]">
      <Container className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <Link href="/admin/orders" className="text-[1.1rem] font-bold text-ink">
            مدیریت ترندز — سفارش‌ها
          </Link>
          <span className="text-[0.85rem] text-text-secondary">{user.name ?? user.mobile}</span>
        </div>
        {children}
      </Container>
    </main>
  );
}
