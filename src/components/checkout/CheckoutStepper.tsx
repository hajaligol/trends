import type { ComponentType, SVGProps } from "react";
import { CartIcon, CheckIcon, PaymentIcon, ShippingIcon } from "@/components/ui/icons";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export type CheckoutStepKey = "cart" | "shipping" | "payment";

type StepDef = { key: CheckoutStepKey; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> };

export const CHECKOUT_STEPS: StepDef[] = [
  { key: "cart", label: "سبد خرید", Icon: CartIcon },
  { key: "shipping", label: "ارسال", Icon: ShippingIcon },
  { key: "payment", label: "پرداخت", Icon: PaymentIcon },
];

/**
 * Progress tracker for the three checkout stages. An ordered list so
 * assistive tech announces "step N of 3"; the current stage carries
 * `aria-current="step"`. Finished stages are buttons that go back to
 * that stage; upcoming stages are inert (you can't skip ahead — each
 * stage's "continue" button validates before advancing).
 *
 * Direction is handled by the document's `dir="rtl"`: the flex row
 * starts on the right, so stage 1 sits at the right edge and progress
 * reads right → left with no per-item mirroring. Connectors are plain
 * flex-1 lines, so they need no logical-property tricks either.
 */
export function CheckoutStepper({
  current,
  onNavigate,
}: {
  current: CheckoutStepKey;
  onNavigate: (step: CheckoutStepKey) => void;
}) {
  const currentIndex = CHECKOUT_STEPS.findIndex((step) => step.key === current);

  return (
    <nav aria-label="مراحل ثبت سفارش" className="mb-8 sm:mb-10">
      <ol className="mx-auto flex max-w-[640px] items-start">
        {CHECKOUT_STEPS.map((step, index) => {
          const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
          const circle = (
            <span
              className={`relative flex h-[52px] w-[52px] items-center justify-center rounded-full border transition-colors duration-200 sm:h-[60px] sm:w-[60px] ${
                state === "current"
                  ? "border-ink bg-ink text-white"
                  : state === "done"
                    ? "border-aqua bg-aqua text-ink"
                    : "border-line bg-white text-text-secondary"
              }`}
            >
              <step.Icon
                aria-hidden="true"
                stroke="currentColor"
                strokeWidth={1.4}
                className="h-[26px] w-[26px] sm:h-[30px] sm:w-[30px]"
              />
              {state === "done" && (
                <span
                  aria-hidden="true"
                  className="absolute -end-0.5 -top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-ink text-white"
                >
                  <CheckIcon width={11} height={11} strokeWidth={3} />
                </span>
              )}
            </span>
          );
          const label = (
            <span className="flex flex-col items-center gap-0.5">
              <span className="text-[0.7rem] text-text-secondary">مرحله {toPersianDigits(index + 1)}</span>
              <span className={`text-[0.88rem] ${state === "upcoming" ? "text-text-secondary" : "font-semibold text-ink"}`}>
                {step.label}
              </span>
            </span>
          );

          return (
            <li
              key={step.key}
              aria-current={state === "current" ? "step" : undefined}
              className="flex flex-1 items-start last:flex-none"
            >
              {state === "done" ? (
                <button
                  type="button"
                  onClick={() => onNavigate(step.key)}
                  className="flex w-[84px] cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-md)] bg-transparent p-0"
                >
                  {circle}
                  {label}
                  <span className="sr-only">(بازگشت به این مرحله)</span>
                </button>
              ) : (
                <div className="flex w-[84px] flex-col items-center gap-2">
                  {circle}
                  {label}
                </div>
              )}
              {index < CHECKOUT_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`mt-[26px] h-[2px] flex-1 rounded-full sm:mt-[29px] ${
                    index < currentIndex ? "bg-aqua" : "bg-ink/10"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
