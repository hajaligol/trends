"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { CONTROL, CONTROL_BASE, POPOVER_PANEL } from "@/components/admin/ui/control-styles";
import { SearchIcon } from "@/components/admin/ui/icons";
import { useDismiss, usePopoverPosition } from "@/components/admin/ui/use-popover";

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

export type ComboboxOption = {
  value: string;
  label: string;
  disabled?: boolean;
  /** Optional optgroup title this option sits under. */
  group?: string;
  /** Extra text that should match a search but is not shown. */
  searchText?: string;
};

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return "";
}

/**
 * Lets every existing `<SelectField><option …/></SelectField>` call site keep
 * working: `<option>` / `<optgroup>` children (also inside fragments or
 * `.map()` arrays) become the option list.
 */
export function optionsFromChildren(children: ReactNode, group?: string): ComboboxOption[] {
  const result: ComboboxOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{
      value?: string | number;
      disabled?: boolean;
      label?: string;
      children?: ReactNode;
    }>;
    if (element.type === Fragment) {
      result.push(...optionsFromChildren(element.props.children, group));
    } else if (element.type === "optgroup") {
      result.push(...optionsFromChildren(element.props.children, element.props.label));
    } else if (element.type === "option") {
      const label = textOf(element.props.children).trim();
      const value = element.props.value === undefined ? label : String(element.props.value);
      result.push({ value, label, disabled: element.props.disabled, group });
    }
  });
  return result;
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Digits, ي/ك, ZWNJ, case and diacritics are ignored so «پیراهن» finds «پیرهن‌های …». */
export function normalizeForSearch(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200d\u064b-\u065f\u0640]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function filterOptions(options: ComboboxOption[], query: string): ComboboxOption[] {
  const tokens = normalizeForSearch(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return options;
  return options.filter((option) => {
    const haystack = normalizeForSearch(`${option.label} ${option.group ?? ""} ${option.searchText ?? ""} ${option.value}`);
    return tokens.every((token) => haystack.includes(token));
  });
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export type ComboboxChange = { target: { value: string; name: string } };

export type ComboboxProps = {
  /** Form field name (a real hidden input submits the value). */
  name: string;
  /** Element id for the trigger so `<label htmlFor>` focuses it. */
  id?: string;
  options?: ComboboxOption[];
  /** `<option>` children, for drop-in use in place of `<select>`. */
  children?: ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (event: ComboboxChange) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Accessible name when there is no visible `<label htmlFor>`. */
  "aria-label"?: string;
  "aria-describedby"?: string;
  /** `full` = fills its container (form fields); `inline` = sizes itself (filter bars). */
  layout?: "full" | "inline";
  minWidthClass?: string;
};

export function Combobox({
  name,
  id,
  options: optionsProp,
  children,
  value: valueProp,
  defaultValue = "",
  onChange,
  required,
  disabled,
  placeholder = "انتخاب کنید…",
  searchPlaceholder = "جستجو در گزینه‌ها…",
  layout = "full",
  minWidthClass = "min-w-[150px]",
  ...aria
}: ComboboxProps) {
  const autoId = useId();
  const triggerId = id ?? `${autoId}-trigger`;
  const listId = `${autoId}-list`;
  const options = useMemo(() => optionsProp ?? optionsFromChildren(children), [optionsProp, children]);

  // Uncontrolled state follows a changed `defaultValue` (filter bars re-render
  // with the URL's value after a submit or «پاک کردن فیلترها»).
  const [inner, setInner] = useState(defaultValue);
  const [seenDefault, setSeenDefault] = useState(defaultValue);
  if (defaultValue !== seenDefault) {
    setSeenDefault(defaultValue);
    setInner(defaultValue);
  }
  const current = valueProp ?? inner;
  const selected = options.find((option) => option.value === current);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, [triggerRef, panelRef], triggerRef);
  const position = usePopoverPosition(open, triggerRef, { width: "trigger", minWidth: 220, desiredHeight: 360 });

  const visible = useMemo(() => filterOptions(options, query), [options, query]);

  function openPanel() {
    if (disabled) return;
    setQuery("");
    const index = options.findIndex((option) => option.value === current && !option.disabled);
    setActiveIndex(Math.max(index, 0));
    setOpen(true);
  }

  function commit(option: ComboboxOption) {
    if (option.disabled) return;
    if (valueProp === undefined) setInner(option.value);
    onChange?.({ target: { value: option.value, name } });
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Focus the search box when the panel opens.
  useEffect(() => {
    if (open && position) searchRef.current?.focus({ preventScroll: true });
  }, [open, position]);

  // The highlighted row, kept valid as the filtered list changes (derived, not synced).
  const firstEnabled = visible.findIndex((option) => !option.disabled);
  const active = visible[activeIndex] && !visible[activeIndex]!.disabled ? activeIndex : Math.max(firstEnabled, 0);

  // Keep the highlighted row scrolled into view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, visible]);

  function move(step: 1 | -1) {
    if (visible.length === 0) return;
    let next = active;
    for (let i = 0; i < visible.length; i++) {
      next = (next + step + visible.length) % visible.length;
      if (!visible[next]!.disabled) break;
    }
    setActiveIndex(next);
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(Math.max(firstEnabled, 0));
    } else if (event.key === "End") {
      event.preventDefault();
      const last = [...visible].reverse().findIndex((option) => !option.disabled);
      if (last >= 0) setActiveIndex(visible.length - 1 - last);
    } else if (event.key === "Enter") {
      event.preventDefault(); // never submit the surrounding form from the search box
      const option = visible[active];
      if (option) commit(option);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openPanel();
    }
  }

  const showPlaceholder = !selected || selected.value === "";
  const triggerText = selected && selected.label !== "" ? selected.label : placeholder;
  const widthClass = layout === "full" ? CONTROL : `${CONTROL_BASE} ${minWidthClass}`;

  return (
    <div className={layout === "full" ? "relative" : "relative inline-block"}>
      {/* The value that actually submits. When required, a real (invisible) text
          input lets the browser's own validation bubble fire; focus is handed
          to the visible trigger. */}
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden="true"
          name={name}
          value={current}
          required
          disabled={disabled}
          onChange={() => {}}
          onFocus={() => triggerRef.current?.focus()}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
        />
      ) : (
        <input type="hidden" name={name} value={current} disabled={disabled} />
      )}

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={aria["aria-label"]}
        aria-describedby={aria["aria-describedby"]}
        aria-required={required || undefined}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={onTriggerKeyDown}
        className={`${widthClass} flex items-center justify-between gap-3 text-start disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={`truncate ${showPlaceholder ? "text-text-secondary" : ""}`}>{triggerText}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && position && (
        <div
          ref={panelRef}
          style={{
            top: position.top,
            bottom: position.bottom,
            left: position.left,
            width: position.width,
            maxHeight: position.maxHeight,
          }}
          className={`${POPOVER_PANEL} flex flex-col overflow-hidden`}
        >
          <div className="relative border-b border-line p-2">
            <SearchIcon
              width={16}
              height={16}
              className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              aria-controls={listId}
              aria-activedescendant={visible[active] ? `${listId}-${active}` : undefined}
              autoComplete="off"
              className="w-full rounded-full border border-line bg-bg px-4 py-2 ps-10 text-[0.84rem] text-ink outline-none placeholder:text-text-secondary/70 focus:border-brand focus:outline-2 focus:outline-offset-1 focus:outline-brand/30 [&::-webkit-search-cancel-button]:hidden"
            />
          </div>

          <ul ref={listRef} id={listId} role="listbox" aria-label={aria["aria-label"]} className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-1.5">
            {visible.length === 0 && (
              <li role="presentation" className="px-3 py-6 text-center text-[0.82rem] text-text-secondary">
                موردی پیدا نشد.
              </li>
            )}
            {visible.map((option, index) => {
              const isSelected = option.value === current;
              const isActive = index === active;
              const showGroup = option.group && option.group !== visible[index - 1]?.group;
              return (
                <Fragment key={`${option.value}-${index}`}>
                  {showGroup && (
                    <li role="presentation" className="px-3 pb-1 pt-2.5 text-[0.72rem] font-semibold text-text-secondary">
                      {option.group}
                    </li>
                  )}
                  <li
                    id={`${listId}-${index}`}
                    role="option"
                    data-index={index}
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    onPointerEnter={() => !option.disabled && setActiveIndex(index)}
                    onClick={() => commit(option)}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-[0.86rem] ${
                      option.disabled
                        ? "cursor-not-allowed text-text-secondary/50"
                        : isActive
                          ? "bg-lavender/60 text-ink"
                          : "text-ink"
                    } ${isSelected ? "font-semibold" : ""}`}
                  >
                    <span className="truncate">{option.label || placeholder}</span>
                    {isSelected && (
                      <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
