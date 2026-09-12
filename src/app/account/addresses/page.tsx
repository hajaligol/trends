import type { Metadata } from "next";
import { getCurrentUser } from "@/domains/auth/actions";
import { getAddressesForUser } from "@/domains/addresses/queries";
import { AddressCard } from "@/components/account/AddressCard";
import { AddAddressPanel } from "@/components/account/AddAddressPanel";

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
      <h1 className="m-0 text-[1.4rem] font-bold">آدرس‌های من</h1>

      {addresses.length === 0 ? (
        <p className="text-[0.9rem] text-text-secondary">هنوز آدرسی ثبت نکرده‌اید.</p>
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
