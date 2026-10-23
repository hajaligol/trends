"use client";

import { useRef, useState } from "react";
import { RulerIcon, XIcon } from "@/components/ui/icons";
import { useDialogA11y } from "@/lib/hooks/useDialogA11y";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/**
 * «راهنمای سایز» button + modal showing the product's admin-entered sizing
 * table. Purely informational; mounted only while open. Dialog semantics,
 * focus trap, Escape and focus restore come from `useDialogA11y`.
 */
export function SizeChartButton({
  title,
  columns,
  rows,
  note,
}: {
  title: string;
  columns: string[];
  rows: string[][];
  note: string | null;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(open, () => setOpen(false), panelRef);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent p-0 text-[0.88rem] text-ink underline underline-offset-4 hover:text-brand"
      >
        <RulerIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        راهنمای سایز
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div aria-hidden="true" onClick={() => setOpen(false)} className="modal-backdrop-in absolute inset-0 bg-ink/40" />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-chart-title"
            className="modal-panel-in relative flex max-h-[90vh] max-sm:max-h-[88dvh] w-full max-w-[640px] flex-col max-sm:max-w-none max-sm:rounded-b-none max-sm:max-h-[92dvh] max-sm:overflow-y-auto max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] rounded-[var(--radius-lg)] bg-bg p-6 shadow-[0_24px_60px_-20px_rgba(24,38,48,0.45)] sm:p-8"
          >
            <button
              type="button"
              aria-label="بستن"
              onClick={() => setOpen(false)}
              className="absolute end-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-ink/[0.06] text-ink"
            >
              <XIcon className="h-[18px] w-[18px]" />
            </button>

            <h2 id="size-chart-title" className="m-0 mb-1 pe-10 text-[1.15rem] font-bold">
              راهنمای سایز
            </h2>
            <p className="m-0 mb-5 text-[0.86rem] text-text-secondary">{title}</p>

            <div className="overflow-auto rounded-[var(--radius-lg)] border border-line bg-white">
              <table className="w-full border-collapse text-center text-[0.88rem]">
                <caption className="sr-only">جدول سایز {title}</caption>
                <thead>
                  <tr className="bg-header-bg/60">
                    {columns.map((heading, index) => (
                      <th key={index} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">
                        {toPersianDigits(heading)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, r) => (
                    <tr key={r} className="border-t border-line">
                      {row.map((cell, c) =>
                        c === 0 ? (
                          <th key={c} scope="row" className="whitespace-nowrap px-4 py-3 font-semibold">
                            {toPersianDigits(cell)}
                          </th>
                        ) : (
                          <td key={c} className="whitespace-nowrap px-4 py-3">
                            {toPersianDigits(cell)}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {note && <p className="m-0 mt-4 text-[0.84rem] leading-7 whitespace-pre-line text-text-secondary">{note}</p>}
          </div>
        </div>
      )}
    </>
  );
}
