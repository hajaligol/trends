import type { ReactNode } from "react";

/** Title block shared by every `/account/*` page: black icon chip, title,
 * one-line description and an optional action on the far side. */
export function AccountPageHeader({
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
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-ink shadow-[0_6px_16px_-10px_rgba(24,38,48,0.35)]"
        >
          {icon}
        </span>
        <div>
          <h1 className="m-0 text-[1.45rem] font-bold leading-tight">{title}</h1>
          {description && <p className="mt-1 text-[0.88rem] text-text-secondary">{description}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}
