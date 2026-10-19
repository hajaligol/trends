"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CONTROL, CONTROL_BASE, POPOVER_PANEL } from "@/components/admin/ui/control-styles";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/admin/ui/icons";
import { useDismiss, usePopoverPosition } from "@/components/admin/ui/use-popover";
import {
  JALALI_MONTHS,
  JALALI_WEEKDAYS_LONG,
  JALALI_WEEKDAYS_SHORT,
  buildPickerValue,
  formatJalaliLong,
  formatPickerValue,
  gregorianToJalali,
  jalaliMonthLength,
  jalaliToGregorian,
  jalaliWeekday,
  parsePickerValue,
  type JalaliDate,
} from "@/lib/utils/jalali";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { dateToTehranInput } from "@/lib/utils/tehran-time";

export type JalaliPickerChange = { target: { value: string; name: string } };

export type JalaliDatePickerProps = {
  name: string;
  id?: string;
  /** `YYYY-MM-DD`, or `YYYY-MM-DDTHH:mm` when `withTime` (Tehran wall clock). */
  value?: string;
  defaultValue?: string;
  onChange?: (event: JalaliPickerChange) => void;
  /** Also pick hour and minute; the submitted value becomes `YYYY-MM-DDTHH:mm`. */
  withTime?: boolean;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  layout?: "full" | "inline";
  minWidthClass?: string;
};

type View = "days" | "months" | "years";

const toDigits = (value: number) => toPersianDigits(value);
const two = (value: number) => toPersianDigits(String(value).padStart(2, "0"));

function todayInTehran(): { jalali: JalaliDate; hour: number; minute: number } {
  const parsed = parsePickerValue(dateToTehranInput(new Date()))!;
  return { jalali: parsed.jalali, hour: parsed.hour, minute: parsed.minute };
}

function addDays(date: JalaliDate, delta: number): JalaliDate {
  const g = jalaliToGregorian(date.year, date.month, date.day);
  const moved = new Date(Date.UTC(g.year, g.month - 1, g.day + delta));
  return gregorianToJalali(moved.getUTCFullYear(), moved.getUTCMonth() + 1, moved.getUTCDate());
}

function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

const sameDay = (a: JalaliDate | null, b: JalaliDate | null) =>
  !!a && !!b && a.year === b.year && a.month === b.month && a.day === b.day;

export function JalaliDatePicker({
  name,
  id,
  value: valueProp,
  defaultValue = "",
  onChange,
  withTime = false,
  required,
  disabled,
  placeholder,
  layout = "full",
  minWidthClass = "min-w-[170px]",
  ...aria
}: JalaliDatePickerProps) {
  const autoId = useId();
  const triggerId = id ?? `${autoId}-trigger`;
  const dialogId = `${autoId}-dialog`;

  const [inner, setInner] = useState(defaultValue);
  const [seenDefault, setSeenDefault] = useState(defaultValue);
  if (defaultValue !== seenDefault) {
    setSeenDefault(defaultValue);
    setInner(defaultValue);
  }
  const current = valueProp ?? inner;
  const parsed = parsePickerValue(current);
  const display = formatPickerValue(withTime ? current : current.slice(0, 10));

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("days");
  const [cursor, setCursor] = useState<{ year: number; month: number }>({ year: 1400, month: 1 });
  const [focusDay, setFocusDay] = useState<JalaliDate | null>(null);
  const [yearPageStart, setYearPageStart] = useState(1400);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, [triggerRef, panelRef], triggerRef);
  const position = usePopoverPosition(open, triggerRef, { width: 304, desiredHeight: withTime ? 470 : 410 });

  function commit(next: string) {
    if (valueProp === undefined) setInner(next);
    onChange?.({ target: { value: next, name } });
  }

  function openPanel() {
    if (disabled) return;
    const base = parsed?.jalali ?? todayInTehran().jalali;
    setCursor({ year: base.year, month: base.month });
    setFocusDay(base);
    setYearPageStart(Math.floor(base.year / 12) * 12);
    setView("days");
    setOpen(true);
  }

  const hour = parsed?.hour ?? 0;
  const minute = parsed?.minute ?? 0;

  function selectDay(day: JalaliDate) {
    commit(buildPickerValue(day, hour, minute, withTime));
    setFocusDay(day);
    if (!withTime) {
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  function setTime(nextHour: number, nextMinute: number) {
    const day = parsed?.jalali ?? todayInTehran().jalali;
    commit(buildPickerValue(day, ((nextHour % 24) + 24) % 24, ((nextMinute % 60) + 60) % 60, true));
  }

  function pickToday() {
    const now = todayInTehran();
    commit(buildPickerValue(now.jalali, withTime ? now.hour : 0, withTime ? now.minute : 0, withTime));
    setCursor({ year: now.jalali.year, month: now.jalali.month });
    setFocusDay(now.jalali);
    if (!withTime) {
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  function clear() {
    commit("");
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Move focus into the day grid when the panel opens or the focused day moves.
  useEffect(() => {
    if (!open || view !== "days" || !position) return;
    gridRef.current?.querySelector<HTMLElement>('[data-focus="true"]')?.focus({ preventScroll: true });
  }, [open, view, position, focusDay, cursor]);

  function onGridKeyDown(event: React.KeyboardEvent) {
    if (!focusDay) return;
    let next: JalaliDate | null = null;
    // The week runs right-to-left, so ArrowLeft is the *next* day.
    if (event.key === "ArrowLeft") next = addDays(focusDay, 1);
    else if (event.key === "ArrowRight") next = addDays(focusDay, -1);
    else if (event.key === "ArrowDown") next = addDays(focusDay, 7);
    else if (event.key === "ArrowUp") next = addDays(focusDay, -7);
    else if (event.key === "PageDown" || event.key === "PageUp") {
      const shifted = shiftMonth(focusDay.year, focusDay.month, event.key === "PageDown" ? 1 : -1);
      next = { ...shifted, day: Math.min(focusDay.day, jalaliMonthLength(shifted.year, shifted.month)) };
    }
    if (!next) return;
    event.preventDefault();
    setFocusDay(next);
    setCursor({ year: next.year, month: next.month });
  }

  const today = open ? todayInTehran().jalali : null;
  const widthClass = layout === "full" ? CONTROL : `${CONTROL_BASE} ${minWidthClass}`;
  const fallback = placeholder ?? (withTime ? "انتخاب تاریخ و ساعت" : "انتخاب تاریخ");

  /* ----------------------------- views ----------------------------- */

  const monthLength = jalaliMonthLength(cursor.year, cursor.month);
  const leading = jalaliWeekday(cursor.year, cursor.month, 1);
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: monthLength }, (_, index) => index + 1),
  ];

  const navButton =
    "inline-flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/[0.06] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand/50";

  const header = (
    <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
      <button
        type="button"
        aria-label={view === "days" ? "ماه قبل" : view === "months" ? "سال قبل" : "بازه قبل"}
        onClick={() => {
          if (view === "days") setCursor((c) => shiftMonth(c.year, c.month, -1));
          else if (view === "months") setCursor((c) => ({ ...c, year: c.year - 1 }));
          else setYearPageStart((s) => s - 12);
        }}
        className={navButton}
      >
        <ChevronRightIcon width={18} height={18} />
      </button>
      <button
        type="button"
        onClick={() => setView(view === "days" ? "months" : view === "months" ? "years" : "days")}
        aria-live="polite"
        className="rounded-full px-3 py-1.5 text-[0.92rem] font-semibold text-ink transition-colors hover:bg-ink/[0.06] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand/50"
      >
        {view === "days"
          ? `${JALALI_MONTHS[cursor.month - 1]} ${toDigits(cursor.year)}`
          : view === "months"
            ? toDigits(cursor.year)
            : `${toDigits(yearPageStart)} – ${toDigits(yearPageStart + 11)}`}
      </button>
      <button
        type="button"
        aria-label={view === "days" ? "ماه بعد" : view === "months" ? "سال بعد" : "بازه بعد"}
        onClick={() => {
          if (view === "days") setCursor((c) => shiftMonth(c.year, c.month, 1));
          else if (view === "months") setCursor((c) => ({ ...c, year: c.year + 1 }));
          else setYearPageStart((s) => s + 12);
        }}
        className={navButton}
      >
        <ChevronLeftIcon width={18} height={18} />
      </button>
    </div>
  );

  const gridCell =
    "flex h-10 items-center justify-center rounded-[var(--radius-sm)] text-[0.88rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand/50";

  const stepper = (label: string, valueNumber: number, onStep: (delta: number) => void, onSet: (n: number) => void, max: number) => (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[0.72rem] text-text-secondary">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`کاهش ${label}`} onClick={() => onStep(-1)} className={`${navButton} !h-8 !w-8`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12h14" /></svg>
        </button>
        <input
          inputMode="numeric"
          aria-label={label}
          value={two(valueNumber)}
          onChange={(event) => {
            const digits = event.target.value
              .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
              .replace(/\D/g, "")
              .slice(-2);
            onSet(Math.min(Number(digits || 0), max));
          }}
          onFocus={(event) => event.target.select()}
          className="h-9 w-12 rounded-[var(--radius-sm)] border border-line bg-white text-center text-[0.95rem] text-ink outline-none focus:border-brand focus:outline-2 focus:outline-offset-1 focus:outline-brand/30"
        />
        <button type="button" aria-label={`افزایش ${label}`} onClick={() => onStep(1)} className={`${navButton} !h-8 !w-8`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12h14M12 5v14" /></svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className={layout === "full" ? "relative" : "relative inline-block"}>
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
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label={aria["aria-label"]}
        aria-describedby={aria["aria-describedby"]}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openPanel();
          }
        }}
        className={`${widthClass} flex items-center justify-between gap-3 text-start disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span dir="rtl" className={`truncate ${display ? "" : "text-text-secondary"}`}>
          {display ?? fallback}
        </span>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-text-secondary">
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {open && position && (
        <div
          ref={panelRef}
          id={dialogId}
          role="dialog"
          aria-label={withTime ? "انتخاب تاریخ و ساعت (تقویم شمسی)" : "انتخاب تاریخ (تقویم شمسی)"}
          style={{ top: position.top, bottom: position.bottom, left: position.left, width: position.width, maxHeight: position.maxHeight }}
          className={`${POPOVER_PANEL} flex flex-col overflow-y-auto`}
        >
          {header}

          {view === "days" && (
            <div ref={gridRef} role="grid" aria-label={`${JALALI_MONTHS[cursor.month - 1]} ${toDigits(cursor.year)}`} onKeyDown={onGridKeyDown} className="px-3 pb-2">
              <div role="row" className="grid grid-cols-7 pb-1">
                {JALALI_WEEKDAYS_SHORT.map((label, index) => (
                  <span
                    key={label}
                    role="columnheader"
                    aria-label={JALALI_WEEKDAYS_LONG[index]}
                    className={`py-1.5 text-center text-[0.74rem] font-medium ${index === 6 ? "text-red-600" : "text-text-secondary"}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-0.5">
                {cells.map((day, index) => {
                  if (day === null) return <span key={`blank-${index}`} role="presentation" />;
                  const date: JalaliDate = { year: cursor.year, month: cursor.month, day };
                  const isSelected = sameDay(date, parsed?.jalali ?? null);
                  const isToday = sameDay(date, today);
                  const isFocus = sameDay(date, focusDay);
                  const isFriday = (leading + day - 1) % 7 === 6;
                  return (
                    <button
                      key={day}
                      type="button"
                      role="gridcell"
                      data-focus={isFocus}
                      tabIndex={isFocus ? 0 : -1}
                      aria-selected={isSelected}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={formatJalaliLong(date)}
                      onClick={() => selectDay(date)}
                      className={`${gridCell} ${
                        isSelected
                          ? "bg-ink font-semibold text-white"
                          : isToday
                            ? "border border-brand/50 font-semibold text-brand hover:bg-lavender/50"
                            : `hover:bg-lavender/50 ${isFriday ? "text-red-600" : "text-ink"}`
                      }`}
                    >
                      {toDigits(day)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {view === "months" && (
            <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
              {JALALI_MONTHS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setCursor((c) => ({ ...c, month: index + 1 }));
                    setFocusDay({ year: cursor.year, month: index + 1, day: 1 });
                    setView("days");
                  }}
                  className={`${gridCell} h-11 ${
                    cursor.month === index + 1 ? "bg-ink font-semibold text-white" : "text-ink hover:bg-lavender/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {view === "years" && (
            <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
              {Array.from({ length: 12 }, (_, index) => yearPageStart + index).map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    setCursor((c) => ({ ...c, year }));
                    setView("months");
                  }}
                  className={`${gridCell} h-11 ${year === cursor.year ? "bg-ink font-semibold text-white" : "text-ink hover:bg-lavender/50"}`}
                >
                  {toDigits(year)}
                </button>
              ))}
            </div>
          )}

          {withTime && view === "days" && (
            <div className="flex items-end justify-center gap-3 border-t border-line px-3 py-3" dir="ltr">
              {stepper("ساعت", hour, (d) => setTime(hour + d, minute), (n) => setTime(n, minute), 23)}
              <span aria-hidden="true" className="pb-2 text-lg text-text-secondary">:</span>
              {stepper("دقیقه", minute, (d) => setTime(hour, minute + d * 5 > 59 && d > 0 ? 0 : minute + d), (n) => setTime(hour, n), 59)}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-line px-3 py-2.5">
            <button
              type="button"
              onClick={pickToday}
              className="rounded-full px-3 py-1.5 text-[0.82rem] font-medium text-brand transition-colors hover:bg-lavender/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand/50"
            >
              {withTime ? "اکنون" : "امروز"}
            </button>
            <div className="flex items-center gap-1">
              {!required && current !== "" && (
                <button
                  type="button"
                  onClick={clear}
                  className="rounded-full px-3 py-1.5 text-[0.82rem] text-text-secondary transition-colors hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand/50"
                >
                  پاک کردن
                </button>
              )}
              {withTime && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className="rounded-full bg-ink px-4 py-1.5 text-[0.82rem] font-semibold text-white transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  تأیید
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
