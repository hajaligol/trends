import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AdminNav } from "@/components/admin/AdminNav";
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
 * Phase 11 update: this was previously a minimal "just Orders" shell
 * built only so Phase 10's fulfillment work had somewhere authorized to
 * live. It now fronts the real dashboard/nav every admin domain added
 * this phase renders behind. Every individual page below this layout
 * still re-checks role itself in its own Server Actions (defense in
 * depth, not "the layout already checked it") — this layout's job is
 * only to keep an unauthorized visitor from ever seeing the admin shell
 * in the first place.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "staff") notFound();

  return (
    <main className="py-[clamp(24px,5vw,48px)]">
      <Container className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="text-[1.1rem] font-bold text-ink">
            مدیریت ترندز
          </Link>
          <span className="text-[0.85rem] text-text-secondary">
            {user.name ?? user.mobile} · {user.role === "admin" ? "مدیر کل" : "کارمند"}
          </span>
        </div>
        <AdminNav />
        {children}
      </Container>
    </main>
  );
}
