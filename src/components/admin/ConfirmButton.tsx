"use client";

import { useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/feedback/ToastProvider";
import { useDialogA11y } from "@/lib/hooks/useDialogA11y";
import { adminButton } from "@/components/admin/ui/layout";
import { AlertTriangleIcon, TrashIcon } from "@/components/admin/ui/icons";
import { Spinner } from "@/components/admin/ui/form";

type Result = { ok: true } | { ok: false; error: string };

/**
 * "Click → confirm in an accessible dialog → run a Server Action → refresh"
 * for destructive admin actions (delete category/variant/image/product…).
 *
 * This replaces the browser's `window.confirm()` popup with an in-design
 * dialog: it names what is about to happen, keeps focus trapped, defaults
 * focus to «انصراف» (so Enter can't delete by accident), closes on Escape or
 * a backdrop click, and keeps any server-side error visible inside the
 * dialog instead of failing silently. The Server Action still performs its
 * own authorization — the dialog is only a UX guard.
 */
export function ConfirmButton({
  action,
  confirmMessage,
  label,
  pendingLabel = "در حال انجام...",
  title,
  confirmLabel = "بله، حذف شود",
  tone = "danger",
  trigger = "text",
  successMessage,
  redirectTo,
}: {
  action: () => Promise<Result>;
  /** Body text of the dialog. Omit to run the action immediately. */
  confirmMessage?: string;
  label: string;
  pendingLabel?: string;
  /** Dialog heading; defaults to the trigger label. */
  title?: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
  /** `icon` renders a compact round icon button (label becomes its tooltip). */
  trigger?: "text" | "icon" | "button";
  successMessage?: string;
  /** Navigate here after success instead of refreshing the current page. */
  redirectTo?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showToast } = useToast();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    if (!isPending) setIsOpen(false);
  };
  useDialogA11y(isOpen, close, panelRef, cancelRef);

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIsOpen(false);
      if (successMessage) showToast(successMessage);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  function handleTrigger() {
    if (confirmMessage) {
      setError(null);
      setIsOpen(true);
    } else {
      run();
    }
  }

  const triggerClass =
    trigger === "icon"
      ? "grid h-9 w-9 cursor-pointer place-items-center rounded-full text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
      : trigger === "button"
        ? adminButton("danger-ghost", "sm")
        : "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[0.8rem] font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50";

  return (
    <>
      <button type="button" disabled={isPending} onClick={handleTrigger} className={triggerClass} aria-label={trigger === "icon" ? label : undefined} title={trigger === "icon" ? label : undefined}>
        {isPending && !isOpen ? (
          <>
            <Spinner />
            {trigger !== "icon" && pendingLabel}
          </>
        ) : (
          <>
            <TrashIcon width={trigger === "icon" ? 18 : 16} height={trigger === "icon" ? 18 : 16} />
            {trigger !== "icon" && label}
          </>
        )}
      </button>

      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[110] grid place-items-center p-4">
            <div aria-hidden="true" onClick={close} className="modal-backdrop-in absolute inset-0 bg-ink/45" />
            <div
              ref={panelRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-desc"
              className="modal-panel-in relative flex w-full max-w-[420px] flex-col gap-4 rounded-[var(--radius-lg)] bg-white p-6 shadow-[0_24px_60px_-20px_rgba(24,38,48,0.5)]"
            >
              <div className="flex items-start gap-4">
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${tone === "danger" ? "bg-blush text-[#9b2c2c]" : "bg-lavender text-brand-dark"}`}
                >
                  <AlertTriangleIcon width={22} height={22} />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h2 id="confirm-title" className="m-0 text-[1.05rem] font-bold text-ink">
                    {title ?? label}
                  </h2>
                  <p id="confirm-desc" className="m-0 text-[0.88rem] leading-7 text-text-secondary">
                    {confirmMessage}
                  </p>
                </div>
              </div>

              {error && (
                <p role="alert" className="m-0 rounded-[var(--radius-md)] bg-red-50 px-4 py-2.5 text-[0.84rem] text-red-800">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2.5">
                <button ref={cancelRef} type="button" onClick={close} disabled={isPending} className={adminButton("secondary", "md")}>
                  انصراف
                </button>
                <button type="button" onClick={run} disabled={isPending} className={adminButton(tone === "danger" ? "danger" : "primary", "md")}>
                  {isPending && <Spinner />}
                  {isPending ? pendingLabel : confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
