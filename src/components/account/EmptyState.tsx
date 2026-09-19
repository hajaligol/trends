import type { ReactNode } from "react";

/** Friendly empty state for dashboard lists. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-ink/15 bg-white/60 px-6 py-10 text-center">
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-ink shadow-[0_6px_16px_-10px_rgba(24,38,48,0.35)] ring-1 ring-line"
      >
        {icon}
      </span>
      <p className="m-0 text-[1rem] font-semibold">{title}</p>
      {description && <p className="m-0 max-w-sm text-[0.88rem] text-text-secondary">{description}</p>}
      {action}
    </div>
  );
}
