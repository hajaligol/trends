import type { Metadata } from "next";
import { getCurrentUser } from "@/domains/auth/actions";
import { findUserById } from "@/domains/auth/queries";
import { AccountDetailsCard } from "@/components/account/AccountDetailsCard";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { DashboardUserIcon } from "@/components/ui/dashboard-icons";

export const metadata: Metadata = {
  title: "پروفایل",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const sessionUser = await getCurrentUser();
  // Re-read the row (the session only carries a few fields); scoped by the signed-in id.
  const user = sessionUser ? await findUserById(sessionUser.id) : null;
  if (!user) return null; // Parent layout already redirects; defensive only.

  return (
    <div className="flex flex-col gap-6">
      <AccountPageHeader
        icon={<DashboardUserIcon className="h-6 w-6" />}
        title="پروفایل"
        description="اطلاعات حساب کاربری شما"
      />
      <AccountDetailsCard user={user} className="max-w-xl" />
    </div>
  );
}
