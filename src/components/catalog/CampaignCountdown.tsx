"use client";

import { useSyncExternalStore } from "react";
import { toPersianDigits } from "@/lib/utils/persian-digits";

let listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let now = 0;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
      listeners = new Set();
    }
  };
}

// The snapshot changes every second; the server snapshot is `null`, so the
// first (hydrating) render matches the server and the clock appears right after.
const getSnapshot = () => now;
const getServerSnapshot = () => null;

const pad = (n: number) => String(n).padStart(2, "0");

/** Live countdown to `endsAt` (ISO). Display only — the server decides when a campaign ends. */
export function CampaignCountdown({
  endsAt,
  variant = "inline",
  tone = "light",
  size = "md",
}: {
  endsAt: string;
  variant?: "inline" | "blocks";
  /** `dark` for use on the black/purple campaign hero. */
  tone?: "light" | "dark";
  /** `sm` is the compact version laid over the sale page's hero image. */
  size?: "md" | "sm";
}) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (current === null || current === 0) return null;
  const remaining = new Date(endsAt).getTime() - current;
  if (remaining <= 0) return <span>پایان یافت</span>;
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  if (variant === "blocks") {
    const units = [
      { value: days, label: "روز" },
      { value: hours, label: "ساعت" },
      { value: minutes, label: "دقیقه" },
      { value: seconds, label: "ثانیه" },
    ];
    const small = size === "sm";
    return (
      <div role="timer" aria-label="زمان باقی‌مانده تا پایان کمپین" className={`flex items-start ${small ? "gap-1.5" : "gap-2"}`}>
        {units.map((unit) => (
          <div key={unit.label} className={`flex flex-col items-center gap-1 ${small ? "min-w-[2.3rem] sm:min-w-[2.9rem]" : "min-w-[3.4rem]"}`}>
            <span
              className={`flex w-full items-center justify-center rounded-[var(--radius-sm)] border font-bold tabular-nums ${
                small ? "h-8 text-[0.95rem] sm:h-10 sm:text-[1.1rem]" : "h-12 text-[1.25rem]"
              } ${
                tone === "dark" ? "border-white/15 bg-white/[0.07] text-white" : "border-line bg-bg text-ink"
              }`}
            >
              {toPersianDigits(pad(unit.value))}
            </span>
            <span className={`${small ? "text-[0.62rem] sm:text-[0.7rem]" : "text-[0.72rem]"} ${tone === "dark" ? "text-white/60" : "text-text-secondary"}`}>{unit.label}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <span dir="ltr" role="timer" aria-label="زمان باقی‌مانده تا پایان کمپین" className="font-semibold tabular-nums">
      {days > 0 && `${toPersianDigits(days)} روز · `}
      {toPersianDigits(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`)}
    </span>
  );
}
