"use client";

import { useState, useTransition } from "react";
import type { Address } from "@/lib/db/schema";
import { deleteAddressAction } from "@/domains/addresses/actions";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { AddressForm } from "@/components/account/AddressForm";

export function AddressCard({ address }: { address: Address }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
        <AddressForm address={address} onDone={() => setEditing(false)} />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mt-3 text-[0.82rem] text-text-secondary underline underline-offset-2"
        >
          انصراف
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-line bg-white p-5 text-[0.9rem]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-ink">{address.recipientName}</p>
        {address.isDefault ? (
          <span className="shrink-0 rounded-full bg-aqua/50 px-2.5 py-0.5 text-[0.72rem] text-ink">
            پیش‌فرض
          </span>
        ) : null}
      </div>
      <p dir="ltr" className="text-right text-text-secondary">
        {toPersianDigits(address.recipientMobile.replace("+98", "0"))}
      </p>
      <p className="text-text-secondary">
        {address.province}، {address.city}، {address.addressLine}
        {address.plaqueUnitDetails ? `، ${address.plaqueUnitDetails}` : ""}
      </p>
      <p className="text-text-secondary">کد پستی: {toPersianDigits(address.postalCode)}</p>
      {address.deliveryNotes ? <p className="text-text-secondary">یادداشت: {address.deliveryNotes}</p> : null}

      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[0.82rem] font-semibold text-ink underline underline-offset-2"
        >
          ویرایش
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteAddressAction(address.id))}
          className="text-[0.82rem] font-semibold text-red-600 underline underline-offset-2 disabled:opacity-50"
        >
          {isPending ? "در حال حذف..." : "حذف"}
        </button>
      </div>
    </div>
  );
}
