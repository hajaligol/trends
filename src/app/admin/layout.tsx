import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getCurrentUser } from "@/domains/auth/actions";
import { getAdminNavBadges } from "@/domains/admin/dashboard";

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
 * Every individual page below this layout still re-checks role itself in
 * its own Server Actions (defense in depth, not "the layout already
 * checked it") — this layout's job is only to keep an unauthorized
 * visitor from ever seeing the admin shell in the first place.
 *
 * The visual frame (sidebar, mobile drawer, user menu) is `AdminShell`;
 * the storefront header/footer are suppressed on `/admin/**` by
 * `StoreChrome` in the root layout.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "staff") notFound();

  const badges = await getAdminNavBadges();

  return (
    <AdminShell user={{ name: user.name ?? user.mobile, role: user.role }} badges={badges}>
      {children}
    </AdminShell>
  );
}
