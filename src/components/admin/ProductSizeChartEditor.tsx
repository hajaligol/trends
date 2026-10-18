"use client";

import { useRef, useState } from "react";
import { AdminSubmitButton, FormAlert, useAdminAction } from "@/components/admin/ui/form";
import { adminButton } from "@/components/admin/ui/layout";
import { CloseIcon, PlusIcon } from "@/components/admin/ui/icons";
import { saveProductSizeChartAction } from "@/domains/catalog/admin-actions";
import { SIZE_CHART_PRESETS } from "@/domains/catalog/size-chart-presets";
import type { ActionResult } from "@/domains/auth/roles";
import {
  MAX_SIZE_CHART_CELL_LENGTH,
  MAX_SIZE_CHART_COLUMNS,
  MAX_SIZE_CHART_NOTE_LENGTH,
  MAX_SIZE_CHART_ROWS,
} from "@/lib/validation/size-chart-limits";

type Chart = { columns: string[]; rows: string[][] };

const initialState: ActionResult<{ saved: boolean; removed: boolean }> = { ok: true, data: { saved: false, removed: false } };

const inputClass =
  "w-full min-w-[5.5rem] rounded-[var(--radius-md)] border border-line bg-white px-3 py-2 text-[0.86rem] text-ink outline-none transition-colors hover:border-ink/25 focus:border-brand focus:outline-2 focus:outline-offset-1 focus:outline-brand/30";
const iconButtonClass =
  "grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-red-700 transition-colors hover:bg-red-50";

/**
 * Editor for a product's sizing table. The admin picks a starting template
 * for the kind of product (tops / trousers / shoes / hats / custom), then
 * edits headings and every cell freely. Client state only tracks the grid;
 * `saveProductSizeChartAction` re-validates everything (auth, shape,
 * limits, audit log). Leaving the grid empty and saving removes the table.
 */
export function ProductSizeChartEditor({
  productId,
  variantSizes,
  initialChart,
  initialNote,
}: {
  productId: string;
  /** The product's own variant sizes — used to pre-fill the size column. */
  variantSizes: string[];
  initialChart: Chart | null;
  initialNote: string | null;
}) {
  const [chart, setChart] = useState<Chart>(initialChart ?? { columns: [], rows: [] });
  const [note, setNote] = useState(initialNote ?? "");
  const [presetId, setPresetId] = useState("");
  const keyCounter = useRef(0);
  const [state, formAction] = useAdminAction(saveProductSizeChartAction, initialState, {
    successMessage: "جدول سایز ذخیره شد",
  });

  const hasGrid = chart.columns.length > 0;

  function applyPreset(id: string) {
    setPresetId(id);
    const preset = SIZE_CHART_PRESETS.find((candidate) => candidate.id === id);
    if (!preset) return;
    if (hasGrid && !window.confirm("جدول فعلی با قالب انتخاب‌شده جایگزین شود؟")) {
      setPresetId("");
      return;
    }
    const sizes = (variantSizes.length > 0 ? variantSizes : preset.defaultSizes).slice(0, MAX_SIZE_CHART_ROWS);
    const rows = (sizes.length > 0 ? sizes : [""]).map((size) => preset.columns.map((_, index) => (index === 0 ? size : "")));
    setChart({ columns: [...preset.columns], rows });
    if (!note.trim()) setNote(preset.note);
  }

  function setHeading(index: number, text: string) {
    setChart((current) => ({ ...current, columns: current.columns.map((c, i) => (i === index ? text : c)) }));
  }
  function setCell(row: number, col: number, text: string) {
    setChart((current) => ({
      ...current,
      rows: current.rows.map((r, i) => (i === row ? r.map((c, j) => (j === col ? text : c)) : r)),
    }));
  }
  function addRow() {
    setChart((current) => ({ ...current, rows: [...current.rows, current.columns.map(() => "")] }));
  }
  function removeRow(index: number) {
    setChart((current) => ({ ...current, rows: current.rows.filter((_, i) => i !== index) }));
  }
  function addColumn() {
    setChart((current) => ({
      columns: [...current.columns, ""],
      rows: current.rows.map((row) => [...row, ""]),
    }));
  }
  function removeColumn(index: number) {
    setChart((current) => ({
      columns: current.columns.filter((_, i) => i !== index),
      rows: current.rows.map((row) => row.filter((_, i) => i !== index)),
    }));
  }
  function clearAll() {
    if (!window.confirm("همه‌ی جدول سایز پاک شود؟ پس از «ذخیره» از صفحه‌ی محصول حذف می‌شود.")) return;
    setChart({ columns: [], rows: [] });
    setPresetId("");
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="productId" value={productId} />
      <FormAlert state={state} />

      <div className="flex flex-wrap items-center gap-2.5">
        <label htmlFor="size-chart-preset" className="text-[0.86rem] text-text-secondary">
          قالب بر اساس نوع محصول:
        </label>
        <select
          id="size-chart-preset"
          value={presetId}
          onChange={(event) => applyPreset(event.target.value)}
          className="rounded-[var(--radius-md)] border border-line bg-white px-3 py-2 text-[0.86rem] text-ink outline-none focus:border-brand"
        >
          <option value="">انتخاب کنید…</option>
          {SIZE_CHART_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      {!hasGrid ? (
        <p className="m-0 rounded-[var(--radius-md)] border border-dashed border-ink/15 px-4 py-8 text-center text-[0.86rem] text-text-secondary">
          برای این محصول جدول سایزی ثبت نشده است و دکمه‌ی «راهنمای سایز» نمایش داده نمی‌شود. یک قالب انتخاب کنید.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-line">
            <table className="w-full border-collapse text-[0.86rem]">
              <caption className="sr-only">ویرایش جدول سایز</caption>
              <thead>
                <tr className="bg-header-bg/60">
                  {chart.columns.map((heading, col) => (
                    <th key={col} scope="col" className="p-2 text-start font-normal">
                      <div className="flex items-center gap-1">
                        <input
                          name="sizeChartColumn"
                          value={heading}
                          onChange={(event) => setHeading(col, event.target.value)}
                          maxLength={MAX_SIZE_CHART_CELL_LENGTH}
                          placeholder="عنوان ستون"
                          aria-label={`عنوان ستون ${col + 1}`}
                          className={`${inputClass} font-semibold`}
                        />
                        <button
                          type="button"
                          onClick={() => removeColumn(col)}
                          disabled={chart.columns.length <= 1}
                          aria-label={`حذف ستون ${col + 1}`}
                          className={`${iconButtonClass} disabled:cursor-not-allowed disabled:opacity-30`}
                        >
                          <CloseIcon width={15} height={15} />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="w-10 p-2" aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {chart.rows.map((row, r) => (
                  <tr key={r} className="border-t border-line">
                    {row.map((cell, c) => (
                      <td key={c} className="p-2">
                        <input
                          name="sizeChartCell"
                          value={cell}
                          onChange={(event) => setCell(r, c, event.target.value)}
                          maxLength={MAX_SIZE_CHART_CELL_LENGTH}
                          aria-label={`${chart.columns[c] || `ستون ${c + 1}`} — ردیف ${r + 1}`}
                          className={inputClass}
                        />
                      </td>
                    ))}
                    <td className="p-2">
                      <button type="button" onClick={() => removeRow(r)} aria-label={`حذف ردیف ${r + 1}`} className={iconButtonClass}>
                        <CloseIcon width={15} height={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="size-chart-note" className="text-[0.86rem] text-text-secondary">
              توضیح زیر جدول (اختیاری)
            </label>
            <textarea
              id="size-chart-note"
              name="sizeChartNote"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={MAX_SIZE_CHART_NOTE_LENGTH}
              rows={2}
              className={inputClass}
            />
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        {hasGrid && (
          <>
            <button type="button" onClick={addRow} disabled={chart.rows.length >= MAX_SIZE_CHART_ROWS} className={adminButton("secondary", "md")}>
              <PlusIcon width={17} height={17} />
              افزودن ردیف
            </button>
            <button type="button" onClick={addColumn} disabled={chart.columns.length >= MAX_SIZE_CHART_COLUMNS} className={adminButton("secondary", "md")}>
              <PlusIcon width={17} height={17} />
              افزودن ستون
            </button>
            <button type="button" onClick={clearAll} className={adminButton("secondary", "md")}>
              حذف جدول
            </button>
          </>
        )}
        <AdminSubmitButton>ذخیره جدول سایز</AdminSubmitButton>
      </div>
    </form>
  );
}
