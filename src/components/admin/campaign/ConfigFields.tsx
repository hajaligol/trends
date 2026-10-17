"use client";

import type { CampaignKind } from "@/lib/db/schema/campaigns";
import { FieldGrid, SelectField, TextField } from "@/components/admin/ui/form";
import { adminButton } from "@/components/admin/ui/layout";
import { MinusIcon, PlusIcon } from "@/components/admin/ui/icons";
import type { Draft } from "./draft";

/** The few inputs each kind needs, nothing else. Every field is controlled. */
export function ConfigFields({ kind, draft, onChange }: { kind: CampaignKind; draft: Draft; onChange: (patch: Partial<Draft>) => void }) {
  const field = (name: keyof Draft, label: string, extra: { suffix?: string; hint?: string; optional?: boolean; min?: number; max?: number } = {}) => (
    <TextField
      label={label}
      name={`cfg-${name}`}
      type="number"
      min={extra.min ?? 0}
      max={extra.max}
      suffix={extra.suffix}
      hint={extra.hint}
      optional={extra.optional}
      value={draft[name] as string}
      onChange={(event) => onChange({ [name]: event.target.value } as Partial<Draft>)}
    />
  );

  switch (kind) {
    case "percent_off":
      return (
        <FieldGrid>
          {field("percent", "درصد تخفیف", { suffix: "درصد", min: 1, max: 99, hint: "عددی از ۱ تا ۹۹." })}
          {field("maxDiscountToman", "سقف تخفیف برای هر کالا", {
            suffix: "تومان",
            optional: true,
            hint: "مثلاً ۲۰٪ تخفیف تا سقف ۵۰۰٬۰۰۰ تومان. خالی = بدون سقف.",
          })}
        </FieldGrid>
      );
    case "amount_off":
      return field("amountToman", "مبلغ تخفیف برای هر عدد کالا", {
        suffix: "تومان",
        min: 1,
        hint: "قیمت هیچ کالایی کمتر از صفر نمی‌شود.",
      });
    case "fixed_price":
      return field("priceToman", "قیمت ثابت هر کالا", {
        suffix: "تومان",
        hint: "فقط برای کالاهایی اعمال می‌شود که قیمتشان بیشتر از این مبلغ است؛ قیمت هیچ کالایی بالا نمی‌رود.",
      });
    case "buy_x_get_y_free":
      return (
        <FieldGrid>
          {field("buyQty", "تعداد خرید", { suffix: "عدد", min: 1, max: 10 })}
          {field("getQty", "تعداد رایگان", {
            suffix: "عدد",
            min: 1,
            max: 10,
            hint: "ارزان‌ترین کالاهای هر دسته رایگان می‌شوند.",
          })}
        </FieldGrid>
      );
    case "buy_x_get_y_percent":
      return (
        <FieldGrid columns={3}>
          {field("buyQty", "تعداد خرید", { suffix: "عدد", min: 1, max: 10 })}
          {field("getQty", "تعداد تخفیف‌دار", { suffix: "عدد", min: 1, max: 10, hint: "ارزان‌ترین‌های هر دسته." })}
          {field("percent", "درصد تخفیف", { suffix: "درصد", min: 1, max: 99 })}
        </FieldGrid>
      );
    case "bundle_price":
      return (
        <FieldGrid>
          {field("qty", "تعداد کالا در هر بسته", { suffix: "عدد", min: 2, max: 20 })}
          {field("priceToman", "قیمت هر بسته", {
            suffix: "تومان",
            hint: "فقط وقتی اعمال می‌شود که از جمع قیمت عادی ارزان‌تر باشد.",
          })}
        </FieldGrid>
      );
    case "tiered_discount":
      return (
        <div className="flex flex-col gap-4">
          <SelectField
            label="پله‌ها بر اساس"
            name="cfg-basis"
            value={draft.basis}
            onChange={(event) => onChange({ basis: event.target.value as Draft["basis"] })}
          >
            <option value="quantity">تعداد کالا در سبد</option>
            <option value="amount">مبلغ کالاهای مشمول</option>
          </SelectField>
          <div className="flex flex-col gap-2.5">
            {draft.tiers.map((tier, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2.5">
                <TextField
                  label={`پله ${index + 1}: از`}
                  name={`cfg-tier-min-${index}`}
                  type="number"
                  min={1}
                  suffix={draft.basis === "quantity" ? "عدد" : "تومان"}
                  value={tier.min}
                  onChange={(event) =>
                    onChange({ tiers: draft.tiers.map((t, i) => (i === index ? { ...t, min: event.target.value } : t)) })
                  }
                />
                <TextField
                  label="درصد تخفیف"
                  name={`cfg-tier-percent-${index}`}
                  type="number"
                  min={1}
                  max={99}
                  suffix="درصد"
                  value={tier.percent}
                  onChange={(event) =>
                    onChange({ tiers: draft.tiers.map((t, i) => (i === index ? { ...t, percent: event.target.value } : t)) })
                  }
                />
                <button
                  type="button"
                  aria-label={`حذف پله ${index + 1}`}
                  disabled={draft.tiers.length <= 1}
                  onClick={() => onChange({ tiers: draft.tiers.filter((_, i) => i !== index) })}
                  className="mb-0.5 grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-ink/[0.05] disabled:opacity-40"
                >
                  <MinusIcon width={16} height={16} />
                </button>
              </div>
            ))}
            {draft.tiers.length < 6 && (
              <button
                type="button"
                onClick={() => onChange({ tiers: [...draft.tiers, { min: "", percent: "" }] })}
                className={adminButton("secondary", "sm", "w-fit")}
              >
                <PlusIcon width={16} height={16} />
                افزودن پله
              </button>
            )}
            <p className="m-0 text-[0.76rem] leading-5 text-text-secondary">هر پله باید حداقل و درصد بیشتری از پله قبل داشته باشد.</p>
          </div>
          {field("maxDiscountToman", "سقف کل تخفیف", { suffix: "تومان", optional: true, hint: "خالی = بدون سقف." })}
        </div>
      );
    case "basket_discount":
      return (
        <div className="flex flex-col gap-4">
          {field("minSpendToman", "حداقل مبلغ خرید برای فعال شدن", {
            suffix: "تومان",
            hint: "مجموع قیمت کالاهای مشمول (بعد از سایر تخفیف‌ها). صفر = بدون حداقل.",
          })}
          <FieldGrid>
            <SelectField
              label="نوع تخفیف"
              name="cfg-discountType"
              value={draft.discountType}
              onChange={(event) => onChange({ discountType: event.target.value as Draft["discountType"] })}
            >
              <option value="percent">درصدی</option>
              <option value="amount">مبلغ ثابت</option>
            </SelectField>
            {field("value", draft.discountType === "percent" ? "درصد تخفیف" : "مبلغ تخفیف", {
              suffix: draft.discountType === "percent" ? "درصد" : "تومان",
              min: 1,
              max: draft.discountType === "percent" ? 99 : undefined,
            })}
          </FieldGrid>
          {field("maxDiscountToman", "سقف کل تخفیف", { suffix: "تومان", optional: true, hint: "خالی = بدون سقف." })}
        </div>
      );
    case "free_shipping":
      return (
        <div className="flex flex-col gap-4">
          {field("minSpendToman", "حداقل مبلغ خرید", {
            suffix: "تومان",
            hint: "صفر = ارسال همه سفارش‌ها رایگان. مبلغ بر اساس کالاهای مشمول و بعد از تخفیف‌ها حساب می‌شود.",
          })}
          <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-line bg-white p-3.5">
            <input
              type="checkbox"
              checked={draft.includeExpress}
              onChange={(event) => onChange({ includeExpress: event.target.checked })}
              className="mt-1 h-4 w-4 accent-[var(--color-brand)]"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-[0.86rem] font-medium text-ink">ارسال اکسپرس هم رایگان شود</span>
              <span className="text-[0.76rem] leading-5 text-text-secondary">
                اگر خاموش باشد فقط ارسال استاندارد رایگان می‌شود و اکسپرس هزینه خودش را دارد.
              </span>
            </span>
          </label>
        </div>
      );
  }
}
