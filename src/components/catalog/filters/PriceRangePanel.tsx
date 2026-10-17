"use client";

import { useId, useState } from "react";
import { parsePriceInput } from "@/domains/catalog/listing-filters";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { PanelActions } from "./FilterDropdown";

/** A "nice" slider step for a price span: ~100 steps, a power of ten, at least 1,000 Toman. */
export function priceSliderStep(min: number, max: number): number {
  const span = Math.max(1, max - min);
  const raw = span / 100;
  const step = 10 ** Math.floor(Math.log10(raw));
  return Math.max(1000, step);
}

const groupDigits = (value: number) => toPersianDigits(value.toLocaleString("en-US"));

/**
 * Price filter: «از» / «تا» number inputs plus a two-thumb slider that edit the
 * same draft. Bounds are the cheapest/dearest variant of the list (from the
 * server). A value equal to its bound means "no limit" and is not sent.
 */
export function PriceRangePanel({
  bounds,
  priceMin,
  priceMax,
  onApply,
}: {
  bounds: { min: number; max: number };
  priceMin?: number;
  priceMax?: number;
  onApply: (range: { priceMin?: number; priceMax?: number }) => void;
}) {
  const step = priceSliderStep(bounds.min, bounds.max);
  // Round the slider's ends outwards so every real price is reachable.
  const low = Math.floor(bounds.min / step) * step;
  const high = Math.ceil(bounds.max / step) * step;

  const [from, setFrom] = useState<string>(priceMin !== undefined ? String(priceMin) : "");
  const [to, setTo] = useState<string>(priceMax !== undefined ? String(priceMax) : "");
  const fromId = useId();
  const toId = useId();

  const fromValue = parsePriceInput(from) ?? low;
  const toValue = parsePriceInput(to) ?? high;
  const sliderFrom = Math.min(Math.max(fromValue, low), high);
  const sliderTo = Math.min(Math.max(toValue, low), high);
  const span = Math.max(1, high - low);
  const startPct = ((Math.min(sliderFrom, sliderTo) - low) / span) * 100;
  const endPct = ((Math.max(sliderFrom, sliderTo) - low) / span) * 100;

  const invalid = parsePriceInput(from) !== undefined && parsePriceInput(to) !== undefined && fromValue > toValue;

  const apply = () => {
    const a = parsePriceInput(from);
    const b = parsePriceInput(to);
    let min = a !== undefined && a > low ? a : undefined;
    let max = b !== undefined && b < high ? b : undefined;
    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
    onApply({ priceMin: min, priceMax: max });
  };

  const numberField = (id: string, label: string, value: string, set: (next: string) => void, placeholder: number) => (
    <div className="flex-1">
      <label htmlFor={id} className="mb-1 block text-[0.78rem] text-text-secondary">
        {label}
      </label>
      <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line bg-bg px-3 py-2 focus-within:border-ink">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          dir="rtl"
          value={value === "" ? "" : groupDigits(parsePriceInput(value) ?? 0)}
          placeholder={groupDigits(placeholder)}
          onChange={(event) => {
            const parsed = parsePriceInput(event.target.value);
            set(parsed === undefined ? "" : String(parsed));
          }}
          className="w-full min-w-0 border-0 bg-transparent p-0 text-[0.9rem] text-ink outline-none placeholder:text-text-secondary/60"
        />
        <span className="shrink-0 text-[0.75rem] text-text-secondary">تومان</span>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-end gap-3">
        {numberField(fromId, "از", from, setFrom, bounds.min)}
        {numberField(toId, "تا", to, setTo, bounds.max)}
      </div>

      {/* Two native range inputs stacked on one track; only the thumbs take pointer events. */}
      <div className="relative mx-2 mt-6 h-6" role="group" aria-label="بازه قیمت">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-ink"
          style={{ insetInlineStart: `${startPct}%`, insetInlineEnd: `${100 - endPct}%` }}
        />
        <input
          type="range"
          aria-label="حداقل قیمت"
          min={low}
          max={high}
          step={step}
          value={sliderFrom}
          onChange={(event) => setFrom(String(Number(event.target.value)))}
          className="range-thumb"
          // When both thumbs sit at the far end the lower one must stay grabbable.
          style={{ zIndex: sliderFrom > (low + high) / 2 ? 3 : 1 }}
        />
        <input
          type="range"
          aria-label="حداکثر قیمت"
          min={low}
          max={high}
          step={step}
          value={sliderTo}
          onChange={(event) => setTo(String(Number(event.target.value)))}
          className="range-thumb"
          style={{ zIndex: 2 }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[0.75rem] text-text-secondary">
        <span>{groupDigits(low)}</span>
        <span>{groupDigits(high)}</span>
      </div>

      {invalid && (
        <p role="alert" className="m-0 mt-2 text-[0.8rem] text-red-700">
          «از» بیشتر از «تا» است؛ هنگام اعمال جابه‌جا می‌شوند.
        </p>
      )}

      <PanelActions
        onApply={apply}
        onClear={() => onApply({})}
        clearDisabled={from === "" && to === "" && priceMin === undefined && priceMax === undefined}
      />
    </div>
  );
}
