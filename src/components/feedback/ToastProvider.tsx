"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckIcon } from "@/components/ui/icons";

/** Total on-screen time, including the enter and exit animations. */
const TOAST_DURATION_MS = 3000;
const EXIT_ANIMATION_MS = 250;

type Toast = { id: number; message: string; leaving: boolean };

type ToastContextValue = {
  /** Shows a short confirmation at the bottom of the screen for 3 seconds.
   * A newer message replaces the current one (and restarts the timer). */
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * App-wide "popup message" host. Owns the single visible toast and the
 * timers; callers only say *what* to announce. The live region is always
 * mounted (an `aria-live` region that appears together with its content is
 * unreliable in some screen readers), and only its child changes.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const nextId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const showToast = useCallback(
    (message: string) => {
      clearTimers();
      const id = ++nextId.current;
      setToast({ id, message, leaving: false });
      timers.current.push(
        setTimeout(() => setToast((current) => (current?.id === id ? { ...current, leaving: true } : current)), TOAST_DURATION_MS - EXIT_ANIMATION_MS),
        setTimeout(() => setToast((current) => (current?.id === id ? null : current)), TOAST_DURATION_MS),
      );
    },
    [clearTimers],
  );

  useEffect(() => clearTimers, [clearTimers]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex justify-center px-4 pb-[calc(24px+env(safe-area-inset-bottom,0px))]"
      >
        {toast ? (
          <div
            key={toast.id}
            className={`flex max-w-full items-center gap-3 rounded-full bg-ink py-2.5 ps-2.5 pe-6 text-[0.92rem] text-white shadow-[0_12px_32px_-10px_rgba(24,38,48,0.55)] ${
              toast.leaving ? "toast-out" : "toast-in"
            }`}
          >
            <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-aqua text-ink">
              <CheckIcon width={18} height={18} strokeWidth={2.2} />
            </span>
            <span>{toast.message}</span>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
