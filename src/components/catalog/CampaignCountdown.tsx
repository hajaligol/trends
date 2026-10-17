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
export function CampaignCountdown({ endsAt }: { endsAt: string }) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (current === null || current === 0) return null;
  const remaining = new Date(endsAt).getTime() - current;
  if (remaining <= 0) return <span>پایان یافت</span>;
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return (
    <span dir="ltr" role="timer" aria-label="زمان باقی‌مانده تا پایان کمپین" className="font-semibold tabular-nums">
      {days > 0 && `${toPersianDigits(days)} روز · `}
      {toPersianDigits(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`)}
    </span>
  );
}
