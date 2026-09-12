"use client";

import { useState } from "react";
import { AddressForm } from "@/components/account/AddressForm";
import { Button } from "@/components/ui/Button";

export function AddAddressPanel() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="ghost" onClick={() => setOpen(true)} className="border border-line">
        + افزودن آدرس جدید
      </Button>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
      <AddressForm onDone={() => setOpen(false)} />
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-3 text-[0.82rem] text-text-secondary underline underline-offset-2"
      >
        انصراف
      </button>
    </div>
  );
}
