import type { Metadata } from "next";
import { getCurrentUser } from "@/domains/auth/actions";
import { getAddressesForUser } from "@/domains/addresses/queries";
import { AddressCard } from "@/components/account/AddressCard";
import { AddAddressPanel } from "@/components/account/AddAddressPanel";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { EmptyState } from "@/components/account/EmptyState";
import { DashboardAddressesIcon } from "@/components/ui/dashboard-icons";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata: Metadata = {
  title: "آدرس‌های من",
  robots: { index: false, follow: false },
};

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) return null; // Parent layout already redirects; defensive only.

  const addresses = await getAddressesForUser(user.id);

  return (
    <div className="flex flex-col gap-6">
      <AccountPageHeader
        icon={<DashboardAddressesIcon className="h-6 w-6" />}
        title="آدرس‌های من"
        description={
          addresses.length > 0
            ? `${toPersianDigits(addresses.length)} آدرس ثبت‌شده برای ارسال سفارش‌ها`
            : "آدرس‌های ارسال سفارش‌های خود را مدیریت کنید"
        }
      />

      {addresses.length === 0 ? (
        <EmptyState
          icon={<DashboardAddressesIcon className="h-7 w-7" />}
          title="هنوز آدرسی ثبت نکرده‌اید"
          description="با ثبت آدرس، مراحل پرداخت سریع‌تر می‌شود."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </div>
      )}

      <AddAddressPanel />
    </div>
  );
}
