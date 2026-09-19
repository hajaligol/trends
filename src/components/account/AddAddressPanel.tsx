"use client";

import { useState } from "react";
import { AddressForm } from "@/components/account/AddressForm";
import { Button } from "@/components/ui/Button";

export function AddAddressPanel() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="brand" onClick={() => setOpen(true)} className="self-start">
        + افزودن آدرس جدید
      </Button>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
      <AddressForm onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />
    </div>
  );
}
