import Link from "next/link";
import type { ReactNode } from "react";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { ChevronLeftIcon, ChevronRightIcon, InboxIcon, SearchIcon } from "@/components/admin/ui/icons";

/**
 * Server-safe building blocks for every admin page (no hooks, no client
 * state). Interactive pieces live in `form.tsx`, `ConfirmButton.tsx` and
 * `ToggleSwitch.tsx`.
 *
 * Design rules shared by everything here: warm-white cards on the page
 * background, 22px card radius / 14px control radius / pill buttons and
 * badges, ink as the primary action colour, soft pastels for status.
 */

/* ------------------------------------------------------------------ */
/* Buttons (class strings so <Link> and <button> share one look)       */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "brand" | "secondary" | "ghost" | "danger" | "danger-ghost";
type ButtonSize = "sm" | "md";

const BUTTON_BASE =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink/85",
  brand: "bg-brand text-white hover:bg-brand-dark",
  secondary: "border border-ink/20 bg-white text-ink hover:border-ink/40 hover:bg-ink/[0.04]",
  ghost: "text-ink hover:bg-ink/[0.06]",
  danger: "bg-red-600 text-white hover:bg-red-700",
  "danger-ghost": "text-red-700 hover:bg-red-50",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-[0.82rem]",
  md: "px-5 py-2.5 text-[0.88rem]",
};

export function adminButton(variant: ButtonVariant = "primary", size: ButtonSize = "md", className = ""): string {
  return [BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className].filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  actions,
  badge,
  ltrTitle = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  /** Small status element shown beside the title (e.g. a StatusBadge). */
  badge?: ReactNode;
  /** For titles that are LTR codes (order numbers, coupon codes). */
  ltrTitle?: boolean;
}) {
  return (
    <header className="flex flex-col gap-3">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1 rounded-full text-[0.82rem] text-text-secondary transition-colors hover:text-brand"
        >
          <ChevronRightIcon width={16} height={16} />
          {backLabel ?? "بازگشت"}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1
              dir={ltrTitle ? "ltr" : undefined}
              className={`m-0 text-[clamp(1.25rem,2.6vw,1.6rem)] leading-tight font-bold text-ink ${ltrTitle ? "text-end" : ""}`}
            >
              {title}
            </h1>
            {badge}
          </div>
          {description && <p className="m-0 max-w-[68ch] text-[0.88rem] leading-7 text-text-secondary">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function Card({
  title,
  description,
  actions,
  children,
  className = "",
  id,
  padded = true,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  padded?: boolean;
}) {
  return (
    <section id={id} className={`scroll-mt-24 rounded-[var(--radius-lg)] border border-line bg-white ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
          <div className="flex flex-col gap-1">
            {title && <h2 className="m-0 text-[1rem] font-bold text-ink">{title}</h2>}
            {description && <p className="m-0 max-w-[62ch] text-[0.82rem] leading-6 text-text-secondary">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padded ? `px-5 pb-5 sm:px-6 sm:pb-6 ${title || actions ? "pt-4" : "pt-5 sm:pt-6"}` : title || actions ? "pt-4" : ""}>
        {children}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

/** Rounded, horizontally scrollable shell for a data table. */
export function TableCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[var(--radius-lg)] border border-line bg-white ${className}`}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export const TABLE = "w-full border-collapse text-[0.86rem]";
export const THEAD = "border-b border-line bg-header-bg/70 text-[0.76rem] text-text-secondary";
export const TH = "px-4 py-3 text-start font-semibold whitespace-nowrap";
export const TR = "border-b border-line transition-colors last:border-0 hover:bg-bg/70";
export const TD = "px-4 py-3.5 align-middle";
export const TD_MUTED = `${TD} text-text-secondary`;

/** A full-width "nothing here" row for inside a <tbody>. */
export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center text-[0.88rem] text-text-secondary">
        {children}
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* Badges, empty state, stat cards                                     */
/* ------------------------------------------------------------------ */

export type Tone = "success" | "warning" | "danger" | "info" | "purple" | "neutral";

const TONE_CLASSES: Record<Tone, { pill: string; dot: string }> = {
  success: { pill: "bg-sage/60 text-ink", dot: "bg-[#6b7d3e]" },
  warning: { pill: "bg-yellow/70 text-ink", dot: "bg-[#c58a12]" },
  danger: { pill: "bg-blush text-[#9b2c2c]", dot: "bg-red-500" },
  info: { pill: "bg-blue/45 text-ink", dot: "bg-[#3b86a8]" },
  purple: { pill: "bg-lavender/70 text-brand-dark", dot: "bg-brand" },
  neutral: { pill: "bg-ink/[0.06] text-text-secondary", dot: "bg-ink/30" },
};

export function StatusBadge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  const classes = TONE_CLASSES[tone];
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[0.76rem] font-medium whitespace-nowrap ${classes.pill} ${className}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} />
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-ink/15 bg-white px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-header-bg text-text-secondary">
        {icon ?? <InboxIcon width={26} height={26} />}
      </span>
      <p className="m-0 text-[1rem] font-bold text-ink">{title}</p>
      {description && <p className="m-0 max-w-[46ch] text-[0.86rem] leading-7 text-text-secondary">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

const STAT_ICON_TONES: Record<"pink" | "blue" | "sage" | "yellow" | "lavender" | "aqua", string> = {
  pink: "bg-pink/70",
  blue: "bg-blue/60",
  sage: "bg-sage/80",
  yellow: "bg-yellow/80",
  lavender: "bg-lavender/80",
  aqua: "bg-aqua/70",
};

export function StatCard({
  label,
  value,
  icon,
  href,
  color = "blue",
  hint,
  attention = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  href?: string;
  color?: keyof typeof STAT_ICON_TONES;
  hint?: string;
  /** Highlights the card when something needs the operator's action. */
  attention?: boolean;
}) {
  const body = (
    <>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] text-ink ${STAT_ICON_TONES[color]}`}>
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[0.8rem] text-text-secondary">{label}</span>
        <span className="truncate text-[1.35rem] leading-tight font-bold text-ink">{value}</span>
        {hint && <span className="text-[0.74rem] text-text-secondary">{hint}</span>}
      </span>
      {attention && <span aria-hidden="true" className="absolute end-4 top-4 h-2.5 w-2.5 rounded-full bg-red-500" />}
    </>
  );
  const classes = `relative flex items-center gap-4 rounded-[var(--radius-lg)] border bg-white p-5 transition-colors ${
    attention ? "border-red-200" : "border-line"
  }`;
  return href ? (
    <Link href={href} className={`${classes} hover:border-ink/30`}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

const CONTROL_BASE =
  "rounded-[var(--radius-md)] border border-line bg-white px-4 py-2.5 text-[0.88rem] text-ink outline-none transition-colors placeholder:text-text-secondary/70 hover:border-ink/25 focus:border-brand focus:outline-2 focus:outline-offset-1 focus:outline-brand/30";

/** Full-width control for form fields; `CONTROL_BASE` (no width) lets the
 * inline filter controls size themselves — two width classes on one
 * element conflict, so the width is never baked into the shared base. */
const CONTROL = `w-full ${CONTROL_BASE}`;
export const ADMIN_CONTROL = CONTROL;

/**
 * GET form wrapper for list filters. Submitting reloads the page with the
 * query string (so every filtered view is shareable and back-button safe).
 */
export function FilterBar({
  children,
  resetHref,
  isFiltered,
  submitLabel = "اعمال فیلتر",
}: {
  children: ReactNode;
  resetHref: string;
  isFiltered: boolean;
  submitLabel?: string;
}) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-3">
      {children}
      <button type="submit" className={adminButton("primary", "md")}>
        {submitLabel}
      </button>
      {isFiltered && (
        <Link href={resetHref} className={adminButton("ghost", "md")}>
          پاک کردن فیلترها
        </Link>
      )}
    </form>
  );
}

export function SearchField({ name = "q", defaultValue, placeholder }: { name?: string; defaultValue?: string; placeholder: string }) {
  return (
    <div className="relative min-w-[220px] flex-1">
      <SearchIcon width={18} height={18} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${CONTROL} ps-10`}
      />
    </div>
  );
}

export function SelectInput({
  name,
  defaultValue,
  label,
  children,
}: {
  name: string;
  defaultValue?: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <select name={name} defaultValue={defaultValue} aria-label={label} className={`${CONTROL_BASE} min-w-[170px]`}>
      {children}
    </select>
  );
}

/** Pill tabs for quick single-value filtering (status, resolved/unresolved…). */
export function FilterTabs({
  items,
}: {
  items: { label: string; href: string; active: boolean; count?: number }[];
}) {
  return (
    <nav aria-label="فیلتر سریع" className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[0.84rem] transition-colors ${
            item.active
              ? "border-ink bg-ink font-semibold text-white"
              : "border-line bg-white text-ink hover:border-ink/30"
          }`}
        >
          {item.label}
          {item.count !== undefined && (
            <span
              className={`rounded-full px-1.5 text-[0.72rem] ${item.active ? "bg-white/20 text-white" : "bg-ink/[0.07] text-text-secondary"}`}
            >
              {toPersianDigits(item.count)}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const wanted = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((n, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && n - previous > 1) result.push("gap");
    result.push(n);
  });
  return result;
}

export function Pagination({
  pathname,
  params,
  page,
  totalPages,
  total,
  pageSize,
}: {
  pathname: string;
  params: Record<string, string | undefined>;
  page: number;
  totalPages: number;
  total?: number;
  pageSize?: number;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => ({
    pathname,
    query: Object.fromEntries(
      Object.entries({ ...params, page: target === 1 ? undefined : String(target) }).filter(([, value]) => value !== undefined && value !== ""),
    ) as Record<string, string>,
  });

  const itemBase = "grid h-9 min-w-9 place-items-center rounded-full px-2 text-[0.84rem] transition-colors";
  const from = total !== undefined && pageSize ? (page - 1) * pageSize + 1 : undefined;
  const to = total !== undefined && pageSize ? Math.min(total, page * pageSize) : undefined;

  return (
    <nav aria-label="صفحه‌بندی" className="flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 text-[0.8rem] text-text-secondary">
        {from !== undefined && to !== undefined && total !== undefined
          ? `نمایش ${toPersianDigits(from)} تا ${toPersianDigits(to)} از ${toPersianDigits(total)}`
          : `صفحه ${toPersianDigits(page)} از ${toPersianDigits(totalPages)}`}
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} aria-label="صفحه قبل" className={`${itemBase} border border-line bg-white hover:border-ink/30`}>
            <ChevronRightIcon width={16} height={16} />
          </Link>
        ) : (
          <span aria-hidden="true" className={`${itemBase} border border-line bg-white opacity-40`}>
            <ChevronRightIcon width={16} height={16} />
          </span>
        )}
        {pageWindow(page, totalPages).map((entry, index) =>
          entry === "gap" ? (
            <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-text-secondary">
              …
            </span>
          ) : (
            <Link
              key={entry}
              href={hrefFor(entry)}
              aria-current={entry === page ? "page" : undefined}
              className={`${itemBase} ${entry === page ? "bg-ink font-semibold text-white" : "text-ink hover:bg-ink/[0.06]"}`}
            >
              {toPersianDigits(entry)}
            </Link>
          ),
        )}
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} aria-label="صفحه بعد" className={`${itemBase} border border-line bg-white hover:border-ink/30`}>
            <ChevronLeftIcon width={16} height={16} />
          </Link>
        ) : (
          <span aria-hidden="true" className={`${itemBase} border border-line bg-white opacity-40`}>
            <ChevronLeftIcon width={16} height={16} />
          </span>
        )}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

/** `/path?a=1&b=2` from a query object, skipping empty values. */
export function buildHref(pathname: string, query: Record<string, string | undefined> = {}): string {
  const entries = Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== "");
  const search = new URLSearchParams(entries).toString();
  return search ? `${pathname}?${search}` : pathname;
}

/** Initial-letter avatar used for customers and the signed-in user chip. */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initial = [...name.trim()][0] ?? "؟";
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-full bg-lavender text-[0.85rem] font-bold text-brand-dark"
    >
      {initial}
    </span>
  );
}

/** Key/value line for detail panels. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-[0.86rem]">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="m-0 font-medium text-ink">{children}</dd>
    </div>
  );
}

export const formatDate = (date: Date) =>
  toPersianDigits(new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "short", day: "numeric" }).format(date));

export const formatDateTime = (date: Date) =>
  toPersianDigits(
    new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date),
  );
