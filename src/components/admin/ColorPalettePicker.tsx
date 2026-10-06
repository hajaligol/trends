"use client";

import { useEffect, useId, useRef, useState } from "react";
import { COLOR_PALETTE, isLightColor, KEEP_CURRENT_COLOR } from "@/domains/catalog/color-palette";
import { ADMIN_CONTROL } from "@/components/admin/ui/layout";
import { CloseIcon } from "@/components/admin/ui/icons";

export function Swatch({ hex, size = 20 }: { hex: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: hex, width: size, height: size }}
      className={`inline-block shrink-0 rounded-full border ${isLightColor(hex) ? "border-ink/25" : "border-transparent"}`}
    />
  );
}

/**
 * Visual colour menu: a trigger showing what's chosen, and a panel with the
 * store palette as labelled swatches. No hex codes are typed anywhere.
 *
 * Controlled by palette `code`s. `multiple` selects several at once (new
 * variants); otherwise it behaves as a single choice (editing one variant).
 * `legacy` is a colour that predates the palette — offered as an extra
 * "current" swatch (code `KEEP_CURRENT_COLOR`) so editing such a variant
 * doesn't force a colour change.
 */
export function ColorPalettePicker({
  label,
  selected,
  onChange,
  multiple = true,
  legacy,
  required,
}: {
  label: string;
  selected: string[];
  onChange: (codes: string[]) => void;
  multiple?: boolean;
  legacy?: { name: string; hex: string | null };
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const options = [
    ...(legacy ? [{ code: KEEP_CURRENT_COLOR, name: `${legacy.name} (فعلی)`, hex: legacy.hex ?? "#FFFFFF" }] : []),
    ...COLOR_PALETTE,
  ];
  const byCode = new Map(options.map((option) => [option.code, option]));
  const chosen = selected.map((code) => byCode.get(code)).filter((option) => option !== undefined);

  const toggle = (code: string) => {
    if (!multiple) {
      onChange([code]);
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    onChange(selected.includes(code) ? selected.filter((value) => value !== code) : [...selected, code]);
  };

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5">
      <span className="flex items-center gap-2 text-[0.84rem] font-medium text-ink">
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-600">
            *
          </span>
        )}
      </span>

      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
        className={`${ADMIN_CONTROL} flex min-h-[46px] cursor-pointer items-center justify-between gap-3 text-start`}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          {chosen.length === 0 ? (
            <span className="text-text-secondary/80">{multiple ? "انتخاب رنگ‌ها از پالت" : "انتخاب رنگ"}</span>
          ) : multiple ? (
            <span className="flex items-center gap-2">
              <span className="flex -space-x-1.5 rtl:space-x-reverse">
                {chosen.slice(0, 6).map((color) => (
                  <Swatch key={color.code} hex={color.hex} size={18} />
                ))}
              </span>
              <span className="text-[0.84rem]">{chosen.length.toLocaleString("fa-IR")} رنگ انتخاب شده</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Swatch hex={chosen[0]!.hex} />
              {chosen[0]!.name}
            </span>
          )}
        </span>
        <span aria-hidden="true" className="text-text-secondary">
          ▾
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="absolute inset-x-0 top-full z-30 mt-2 rounded-[var(--radius-lg)] border border-line bg-white p-3 shadow-[0_18px_40px_-16px_rgba(24,38,48,0.35)] sm:min-w-[26rem]"
        >
          <ul className="m-0 grid max-h-80 list-none grid-cols-3 gap-1.5 overflow-y-auto p-0 sm:grid-cols-5">
            {options.map((color) => {
              const isSelected = selected.includes(color.code);
              return (
                <li key={color.code}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(color.code)}
                    className={`flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-[var(--radius-md)] border px-1.5 py-2 text-[0.74rem] leading-4 text-ink transition-colors hover:bg-ink/[0.04] ${
                      isSelected ? "border-brand bg-brand/[0.06] font-semibold" : "border-transparent"
                    }`}
                  >
                    <span className="relative">
                      <Swatch hex={color.hex} size={30} />
                      {isSelected && (
                        <span
                          aria-hidden="true"
                          className={`absolute inset-0 grid place-items-center text-[0.9rem] font-bold ${isLightColor(color.hex) ? "text-ink" : "text-white"}`}
                        >
                          ✓
                        </span>
                      )}
                    </span>
                    <span className="text-center">{color.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
            {multiple && selected.length > 0 ? (
              <button type="button" onClick={() => onChange([])} className="cursor-pointer text-[0.8rem] text-text-secondary hover:text-brand">
                پاک کردن انتخاب‌ها
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="cursor-pointer rounded-full bg-ink px-4 py-1.5 text-[0.8rem] font-semibold text-white"
            >
              تأیید
            </button>
          </div>
        </div>
      )}

      {multiple && chosen.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {chosen.map((color) => (
            <li key={color.code} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white py-1 ps-2 pe-1 text-[0.78rem]">
              <Swatch hex={color.hex} size={14} />
              {color.name}
              <button
                type="button"
                aria-label={`حذف رنگ ${color.name}`}
                onClick={() => toggle(color.code)}
                className="grid h-5 w-5 cursor-pointer place-items-center rounded-full text-text-secondary hover:bg-ink/[0.08]"
              >
                <CloseIcon width={12} height={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
