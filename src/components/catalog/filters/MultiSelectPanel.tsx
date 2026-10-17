"use client";

import { useId, useMemo, useState } from "react";
import { toLatinDigits } from "@/lib/utils/digits";
import { PanelActions } from "./FilterDropdown";

export type FilterOption = {
  value: string;
  label: string;
  /** Secondary text (e.g. a brand's Latin name). Also searched. */
  hint?: string | null;
  /** CSS colour for a swatch dot (colour filter). */
  swatch?: string | null;
};

/** Lower-case, Latin digits, Arabic ي/ك → Persian ی/ک, no ZWNJ/spaces — so
 * searching "کفش" finds "کفش" however it was typed. */
export function normalizeForSearch(value: string): string {
  return toLatinDigits(value)
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\s]/g, "");
}

/**
 * Checkbox list for a multi-select filter, with an optional search box (the
 * brand filter). Selection is a local draft until «اعمال فیلتر», so choosing
 * several values costs one page load, not one per click.
 */
export function MultiSelectPanel({
  options,
  selected,
  onApply,
  searchable = false,
  searchLabel = "جستجو",
  displayValue = (value: string) => value,
}: {
  options: FilterOption[];
  selected: string[];
  onApply: (values: string[]) => void;
  searchable?: boolean;
  searchLabel?: string;
  /** Display transform for option labels (Persian digits for sizes). */
  displayValue?: (value: string) => string;
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  const [query, setQuery] = useState("");
  const searchId = useId();

  const visible = useMemo(() => {
    const needle = normalizeForSearch(query);
    if (!needle) return options;
    return options.filter((option) => normalizeForSearch(`${option.label} ${option.hint ?? ""}`).includes(needle));
  }, [options, query]);

  const toggle = (value: string) =>
    setDraft((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));

  return (
    <div>
      {searchable && (
        <div className="mb-3">
          <label htmlFor={searchId} className="sr-only">
            {searchLabel}
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchLabel}
            autoComplete="off"
            className="w-full rounded-full border border-line bg-bg px-4 py-2 text-[0.88rem] text-ink outline-none placeholder:text-text-secondary focus:border-ink"
          />
        </div>
      )}

      <ul className="m-0 flex max-h-64 list-none flex-col gap-0.5 overflow-y-auto p-0">
        {visible.map((option) => {
          const checked = draft.includes(option.value);
          return (
            <li key={option.value}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 text-[0.9rem] hover:bg-card-image">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option.value)}
                  className="h-4 w-4 shrink-0 accent-ink"
                />
                {option.swatch !== undefined && (
                  <span
                    aria-hidden="true"
                    style={option.swatch ? { backgroundColor: option.swatch } : undefined}
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-ink/20 bg-card-image"
                  />
                )}
                <span className="text-ink">{displayValue(option.label)}</span>
                {option.hint && <span dir="ltr" className="ms-auto text-[0.78rem] text-text-secondary">{option.hint}</span>}
              </label>
            </li>
          );
        })}
      </ul>

      {visible.length === 0 && (
        <p role="status" className="m-0 py-4 text-center text-[0.86rem] text-text-secondary">
          موردی پیدا نشد.
        </p>
      )}

      <PanelActions
        onApply={() => onApply(draft)}
        onClear={() => onApply([])}
        clearDisabled={draft.length === 0 && selected.length === 0}
      />
    </div>
  );
}
