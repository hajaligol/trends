"use client";

import { useRef, useState } from "react";
import { AdminSubmitButton, FormAlert, useAdminAction } from "@/components/admin/ui/form";
import { adminButton } from "@/components/admin/ui/layout";
import { ArrowDownIcon, ArrowUpIcon, CloseIcon, PlusIcon } from "@/components/admin/ui/icons";
import { saveProductSpecificationsAction } from "@/domains/catalog/admin-actions";
import type { ActionResult } from "@/domains/auth/roles";
import { MAX_SPEC_ROWS } from "@/lib/validation/spec-limits";

type Row = { key: number; label: string; value: string };

const initialState: ActionResult<{ saved: boolean }> = { ok: true, data: { saved: false } };

/** Labels of the rows the storefront derives automatically. Typing one of
 * these as a custom label overrides that automatic row's value. */
const AUTO_ROW_LABELS = ["برند", "دسته‌بندی", "جنس", "سایزها", "رنگ‌ها", "برچسب‌ها"];

const inputClass =
  "w-full rounded-[var(--radius-md)] border border-line bg-white px-3.5 py-2.5 text-[0.88rem] text-ink outline-none transition-colors hover:border-ink/25 focus:border-brand focus:outline-2 focus:outline-offset-1 focus:outline-brand/30";
const iconButtonClass =
  "grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

/**
 * Editor for a product's custom «مشخصات محصول» rows. Client state only
 * tracks the rows being edited; everything is re-validated and saved by
 * `saveProductSpecificationsAction` (auth, schema, uniqueness, audit log) —
 * nothing here is trusted just because the form rendered.
 */
export function ProductSpecificationsEditor({
  productId,
  initialRows,
}: {
  productId: string;
  initialRows: Array<{ label: string; value: string }>;
}) {
  const nextKey = useRef(initialRows.length);
  const [rows, setRows] = useState<Row[]>(() => initialRows.map((row, index) => ({ key: index, ...row })));
  const [state, formAction] = useAdminAction(saveProductSpecificationsAction, initialState, {
    successMessage: "جدول مشخصات ذخیره شد",
  });

  function update(key: number, field: "label" | "value", text: string) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: text } : row)));
  }
  function addRow() {
    setRows((current) => [...current, { key: nextKey.current++, label: "", value: "" }]);
  }
  function removeRow(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
  }
  function moveRow(index: number, direction: -1 | 1) {
    setRows((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target]!, copy[index]!];
      return copy;
    });
  }

  const listId = `spec-labels-${productId}`;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="productId" value={productId} />


      <datalist id={listId}>
        {AUTO_ROW_LABELS.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>

      <FormAlert state={state} />

      {rows.length === 0 ? (
        <p className="m-0 rounded-[var(--radius-md)] border border-dashed border-ink/15 px-4 py-8 text-center text-[0.86rem] text-text-secondary">
          هنوز ردیف سفارشی‌ای اضافه نشده است. با «افزودن ردیف» شروع کنید.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <li key={row.key} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <input
                name="specLabel"
                value={row.label}
                onChange={(event) => update(row.key, "label", event.target.value)}
                list={listId}
                maxLength={80}
                placeholder="عنوان (مثلاً قد مدل)"
                aria-label={`عنوان ردیف ${index + 1}`}
                className={`${inputClass} sm:max-w-[13rem]`}
              />
              <input
                name="specValue"
                value={row.value}
                onChange={(event) => update(row.key, "value", event.target.value)}
                maxLength={500}
                placeholder="مقدار (مثلاً ۱۸۵ سانتی‌متر)"
                aria-label={`مقدار ردیف ${index + 1}`}
                className={`${inputClass} min-w-0 flex-1`}
              />
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => moveRow(index, -1)}
                  disabled={index === 0}
                  aria-label={`انتقال ردیف ${index + 1} به بالا`}
                  className={iconButtonClass}
                >
                  <ArrowUpIcon width={17} height={17} />
                </button>
                <button
                  type="button"
                  onClick={() => moveRow(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label={`انتقال ردیف ${index + 1} به پایین`}
                  className={iconButtonClass}
                >
                  <ArrowDownIcon width={17} height={17} />
                </button>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  aria-label={`حذف ردیف ${index + 1}`}
                  className={`${iconButtonClass} text-red-700 hover:bg-red-50`}
                >
                  <CloseIcon width={17} height={17} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= MAX_SPEC_ROWS}
          className={adminButton("secondary", "md")}
        >
          <PlusIcon width={17} height={17} />
          افزودن ردیف
        </button>
        <AdminSubmitButton>ذخیره جدول مشخصات</AdminSubmitButton>
      </div>
    </form>
  );
}
