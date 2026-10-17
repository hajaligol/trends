"use client";

import type { CampaignKind } from "@/lib/db/schema/campaigns";
import { KIND_META } from "@/domains/campaigns/labels";

const GROUPS: Array<{ title: string; hint: string; kinds: CampaignKind[] }> = [
  {
    title: "تخفیف روی قیمت کالا",
    hint: "قیمت جدید همه‌جا (کارت محصول، صفحه محصول، جستجو) نمایش داده می‌شود.",
    kinds: ["percent_off", "amount_off", "fixed_price"],
  },
  {
    title: "تخفیف بر اساس سبد خرید",
    hint: "در سبد خرید و هنگام پرداخت اعمال می‌شود؛ در صفحه محصول به‌صورت پیام نمایش داده می‌شود.",
    kinds: ["buy_x_get_y_free", "buy_x_get_y_percent", "bundle_price", "tiered_discount", "basket_discount"],
  },
  { title: "ارسال", hint: "", kinds: ["free_shipping"] },
];

/** Radio cards: the native input stays focusable/keyboard-operable (sr-only). */
export function KindPicker({ value, onChange }: { value: CampaignKind; onChange: (kind: CampaignKind) => void }) {
  return (
    <div className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <fieldset key={group.title} className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-1 p-0 text-[0.88rem] font-semibold text-ink">{group.title}</legend>
          {group.hint && <p className="m-0 mb-3 text-[0.78rem] leading-5 text-text-secondary">{group.hint}</p>}
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {group.kinds.map((kind) => {
              const meta = KIND_META[kind];
              const selected = value === kind;
              return (
                <label
                  key={kind}
                  className={`flex cursor-pointer flex-col gap-1 rounded-[var(--radius-md)] border p-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand/50 ${
                    selected ? "border-brand bg-lavender/30 shadow-[0_0_0_1px_var(--color-brand)]" : "border-line bg-white hover:border-ink/30"
                  }`}
                >
                  <input type="radio" name="campaign-kind" value={kind} checked={selected} onChange={() => onChange(kind)} className="sr-only" />
                  <span className="text-[0.9rem] font-semibold text-ink">{meta.title}</span>
                  <span className="text-[0.76rem] leading-5 text-text-secondary">{meta.description}</span>
                  <span className="mt-0.5 text-[0.74rem] text-brand-dark">مثال: {meta.example}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
