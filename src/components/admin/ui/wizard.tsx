"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { adminButton } from "@/components/admin/ui/layout";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/**
 * Building blocks for the staged "create" flows (new product, new campaign).
 *
 * Design rules shared by both wizards:
 *  - Every panel stays **mounted** (inactive ones are only `hidden`), so
 *    uncontrolled inputs keep their values and a surrounding `<form>` still
 *    submits every stage in one request.
 *  - Moving forward runs the current stage's validator; moving back never does.
 *  - Nothing here is authoritative. The Server Action re-validates everything.
 */

export type WizardStepMeta = { id: string; title: string; hint?: string };

type UseWizardOptions = {
  count: number;
  /** Edit mode: every stage is reachable at once. */
  freeNavigation?: boolean;
};

export function useWizard({ count, freeNavigation = false }: UseWizardOptions) {
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);

  // After a stage change (not on first paint) move focus to the new stage's
  // heading so keyboard / screen-reader users land at the top of it.
  useEffect(() => {
    if (!hasNavigated.current) return;
    const heading = headingRef.current;
    if (!heading) return;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step]);

  const goTo = useCallback(
    (target: number) => {
      if (target < 0 || target >= count) return;
      hasNavigated.current = true;
      setStepError(null);
      setStep(target);
      setMaxReached((current) => Math.max(current, target));
    },
    [count],
  );

  /** Advances one stage if `validate` (when given) returns no error. */
  const next = useCallback(
    (validate?: () => string | null) => {
      const error = validate?.() ?? null;
      if (error) {
        setStepError(error);
        return false;
      }
      goTo(step + 1);
      return true;
    },
    [goTo, step],
  );

  const back = useCallback(() => goTo(step - 1), [goTo, step]);

  /** Clicking a stage in the stepper: back is always fine; forward only to stages already reached. */
  const select = useCallback(
    (target: number) => {
      if (freeNavigation || target <= maxReached) goTo(target);
    },
    [freeNavigation, goTo, maxReached],
  );

  return {
    step,
    maxReached,
    stepError,
    setStepError,
    headingRef,
    isFirst: step === 0,
    isLast: step === count - 1,
    goTo,
    next,
    back,
    select,
    freeNavigation,
  };
}

/* ------------------------------------------------------------------ */
/* Stepper                                                             */
/* ------------------------------------------------------------------ */

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

export function WizardStepper({
  steps,
  current,
  maxReached,
  freeNavigation,
  onSelect,
  label,
}: {
  steps: WizardStepMeta[];
  current: number;
  maxReached: number;
  freeNavigation?: boolean;
  onSelect: (index: number) => void;
  label: string;
}) {
  return (
    <nav aria-label={label} className="rounded-[var(--radius-lg)] border border-line bg-white px-3 py-3 sm:px-5 sm:py-4">
      <p className="m-0 mb-2 text-[0.8rem] font-semibold text-ink sm:hidden">
        مرحله {toPersianDigits(current + 1)} از {toPersianDigits(steps.length)}: {steps[current]?.title}
      </p>
      <ol className="m-0 flex list-none gap-1.5 p-0 sm:gap-2">
        {steps.map((meta, index) => {
          const isCurrent = index === current;
          const isDone = !freeNavigation && index < maxReached && !isCurrent;
          const reachable = freeNavigation || index <= maxReached;
          return (
            <li key={meta.id} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onSelect(index)}
                disabled={!reachable}
                aria-current={isCurrent ? "step" : undefined}
                className={`group flex w-full flex-col gap-1.5 rounded-[var(--radius-md)] border-0 bg-transparent p-1 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand/60 ${
                  reachable ? "cursor-pointer" : "cursor-not-allowed"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`block h-1.5 w-full rounded-full transition-colors ${
                    isCurrent ? "bg-brand" : isDone || (freeNavigation && reachable) ? "bg-brand/40" : "bg-ink/10"
                  }`}
                />
                <span className="hidden items-center gap-1.5 sm:flex">
                  <span
                    aria-hidden="true"
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.68rem] font-bold ${
                      isCurrent ? "bg-brand text-white" : isDone ? "bg-brand/15 text-brand" : "bg-ink/10 text-text-secondary"
                    }`}
                  >
                    {isDone ? <CheckIcon /> : toPersianDigits(index + 1)}
                  </span>
                  <span
                    className={`truncate text-[0.78rem] ${isCurrent ? "font-bold text-ink" : reachable ? "font-medium text-ink/80" : "text-text-secondary"}`}
                  >
                    {meta.title}
                  </span>
                </span>
                <span className="sr-only">
                  {isDone ? "(تکمیل شده)" : isCurrent ? "(مرحله فعلی)" : reachable ? "" : "(هنوز در دسترس نیست)"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Panel + footer                                                      */
/* ------------------------------------------------------------------ */

/** One stage. Stays mounted while hidden so its fields keep state and still submit. */
export function WizardPanel({
  active,
  index,
  total,
  title,
  description,
  headingRef,
  error,
  children,
}: {
  active: boolean;
  index: number;
  total: number;
  title: string;
  description?: ReactNode;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <section hidden={!active} aria-labelledby={`wizard-step-${index}`} className="scroll-mt-24 rounded-[var(--radius-lg)] border border-line bg-white">
      <div className="flex flex-col gap-1 px-5 pt-5 sm:px-6">
        <p className="m-0 text-[0.74rem] font-semibold text-brand">
          مرحله {toPersianDigits(index + 1)} از {toPersianDigits(total)}
        </p>
        <h2
          id={`wizard-step-${index}`}
          ref={active ? headingRef : undefined}
          tabIndex={-1}
          className="m-0 text-[1.05rem] font-bold text-ink outline-none"
        >
          {title}
        </h2>
        {description && <p className="m-0 max-w-[66ch] text-[0.82rem] leading-6 text-text-secondary">{description}</p>}
      </div>
      <div className="flex flex-col gap-4 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        {active && error && (
          <p role="alert" className="m-0 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-[0.84rem] leading-6 text-red-800">
            {error}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

/** Back / Next row. The last stage renders `submit` (the real save button) instead of Next. */
export function WizardFooter({
  isFirst,
  isLast,
  onBack,
  onNext,
  nextLabel = "ادامه",
  submit,
  hint,
  extra,
}: {
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  submit: ReactNode;
  hint?: string;
  /** Extra action shown next to «ادامه» (e.g. a direct Save while editing). */
  extra?: ReactNode;
}) {
  return (
    <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-line bg-white/95 px-4 py-3 shadow-[0_10px_30px_-12px_rgba(24,38,48,0.28)] backdrop-blur sm:px-5">
      <button type="button" onClick={onBack} disabled={isFirst} className={adminButton("secondary", "md", isFirst ? "invisible" : "")}>
        قبلی
      </button>
      {hint && <p className="m-0 hidden flex-1 text-center text-[0.78rem] text-text-secondary md:block">{hint}</p>}
      {isLast ? (
        submit
      ) : (
        <div className="flex items-center gap-2.5">
          {extra}
          <button type="button" onClick={onNext} className={adminButton(extra ? "secondary" : "primary", "md")}>
            {nextLabel}
          </button>
        </div>
      )}
    </div>
  );
}

/** One label/value line for the review stage. */
export function ReviewRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-line py-2.5 text-[0.86rem] last:border-0">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="m-0 max-w-[32rem] text-end font-medium text-ink">{children}</dd>
    </div>
  );
}
