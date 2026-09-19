"use client";

import { useState, useTransition } from "react";
import type { Address } from "@/lib/db/schema";
import { deleteAddressAction } from "@/domains/addresses/actions";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { AddressForm } from "@/components/account/AddressForm";
import { DashboardAddressesIcon } from "@/components/ui/dashboard-icons";

export function AddressCard({ address }: { address: Address }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[0_14px_34px_-24px_rgba(24,38,48,0.3)]">
        <AddressForm address={address} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-5 text-[0.9rem] shadow-[0_14px_34px_-24px_rgba(24,38,48,0.3)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6f3ee] text-ink"
          >
            <DashboardAddressesIcon className="h-6 w-6" />
          </span>
          <p className="m-0 truncate font-semibold text-ink">{address.recipientName}</p>
        </div>
        {address.isDefault ? (
          <span className="shrink-0 rounded-full bg-aqua/50 px-2.5 py-0.5 text-[0.72rem] font-semibold text-ink">
            پیش‌فرض
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <p dir="ltr" className="m-0 text-right text-text-secondary">
          {toPersianDigits(address.recipientMobile.replace("+98", "0"))}
        </p>
        <p className="m-0 leading-7 text-text-secondary">
          {address.province}، {address.city}، {address.addressLine}
          {address.plaqueUnitDetails ? `، ${address.plaqueUnitDetails}` : ""}
        </p>
        <p className="m-0 text-text-secondary">کد پستی: {toPersianDigits(address.postalCode)}</p>
        {address.deliveryNotes ? <p className="m-0 text-text-secondary">یادداشت: {address.deliveryNotes}</p> : null}
      </div>

      <div className="mt-1 flex gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-full border border-line px-4 py-1.5 text-[0.82rem] font-semibold text-ink transition-colors duration-200 hover:bg-ink/5"
        >
          ویرایش
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteAddressAction(address.id))}
          className="rounded-full border border-red-200 px-4 py-1.5 text-[0.82rem] font-semibold text-red-600 transition-colors duration-200 hover:bg-red-50 disabled:opacity-50"
        >
          {isPending ? "در حال حذف..." : "حذف"}
        </button>
      </div>
    </div>
  );
}
