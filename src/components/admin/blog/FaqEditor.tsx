"use client";

import { useState } from "react";
import { adminButton, ADMIN_CONTROL } from "@/components/admin/ui/layout";
import { PlusIcon, TrashIcon } from "@/components/admin/ui/icons";
import type { BlogFaqItem } from "@/lib/db/schema";

/** Question/answer rows, submitted as one JSON string in the hidden `faq` input (validated by the server action). */
export function FaqEditor({ defaultValue = [] }: { defaultValue?: BlogFaqItem[] }) {
  const [items, setItems] = useState<BlogFaqItem[]>(defaultValue);

  const update = (index: number, patch: Partial<BlogFaqItem>) => setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="faq" value={JSON.stringify(items)} />
      {items.length === 0 && <p className="m-0 text-[0.84rem] text-text-secondary">هنوز پرسشی اضافه نشده است.</p>}
      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-line bg-bg/60 p-3.5">
          <input
            aria-label={`پرسش ${index + 1}`}
            value={item.question}
            maxLength={200}
            onChange={(event) => update(index, { question: event.target.value })}
            placeholder="پرسش"
            className={ADMIN_CONTROL}
          />
          <textarea
            aria-label={`پاسخ ${index + 1}`}
            value={item.answer}
            maxLength={1500}
            rows={3}
            onChange={(event) => update(index, { answer: event.target.value })}
            placeholder="پاسخ کوتاه و مستقیم (۱ تا ۳ جمله)"
            className={`${ADMIN_CONTROL} leading-7`}
          />
          <button type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))} className={adminButton("ghost", "sm", "w-fit text-red-700")}>
            <TrashIcon width={16} height={16} />
            حذف پرسش
          </button>
        </div>
      ))}
      {items.length < 12 && (
        <button type="button" onClick={() => setItems((current) => [...current, { question: "", answer: "" }])} className={adminButton("secondary", "sm", "w-fit")}>
          <PlusIcon width={16} height={16} />
          افزودن پرسش
        </button>
      )}
    </div>
  );
}
