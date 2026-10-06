"use client";

import { useMemo, useState } from "react";
import { ColorPalettePicker, Swatch } from "@/components/admin/ColorPalettePicker";
import { TextField } from "@/components/admin/ui/form";
import { COLOR_PALETTE, getPaletteColor } from "@/domains/catalog/color-palette";
import { MAX_SIZE_LENGTH, SIZE_PRESETS } from "@/domains/catalog/sizes";
import { buildVariantSku } from "@/domains/catalog/sku";
import { MAX_BULK_VARIANTS } from "@/lib/validation/admin-limits";
import { toLatinDigits } from "@/lib/utils/digits";
import { TABLE, TD, TH, THEAD, TR, TableCard } from "@/components/admin/ui/layout";
import { CloseIcon } from "@/components/admin/ui/icons";

/** Parses a typed integer (Persian digits and separators allowed). */
function parseInteger(value: string): number | null {
  const cleaned = toLatinDigits(value).replace(/[,٬،\s]/g, "");
  if (cleaned === "" || !/^\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}

type RowOverride = { price?: string; compareAt?: string; stock?: string };

export type ExistingVariantKey = { size: string; color: string };

/**
 * Choose several sizes and several colours at once; every combination
 * becomes a variant. Shared price/stock fill the table, and any row can be
 * adjusted individually (e.g. less stock in XXL).
 *
 * Renders a hidden `variantsJson` field consumed by `createProductAction` /
 * `createVariantsAction`. Everything here is a convenience: the server
 * re-validates every number, resolves colours from the palette by code and
 * generates the SKUs itself.
 */
export function VariantMatrixBuilder({
  productCode,
  existing = [],
  compact = false,
}: {
  /** Known only for an existing product; on create the SKU preview shows a placeholder. */
  productCode?: number;
  existing?: ExistingVariantKey[];
  compact?: boolean;
}) {
  const [sizes, setSizes] = useState<string[]>([]);
  const [colorCodes, setColorCodes] = useState<string[]>([]);
  const [customSize, setCustomSize] = useState("");
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [stock, setStock] = useState("0");
  const [lowStock, setLowStock] = useState("5");
  const [material, setMaterial] = useState("");
  const [overrides, setOverrides] = useState<Record<string, RowOverride>>({});

  const presetOrder = useMemo(() => SIZE_PRESETS.flatMap((preset) => preset.sizes as readonly string[]), []);
  const orderedSizes = useMemo(
    () =>
      [...sizes].sort((a, b) => {
        const ai = presetOrder.indexOf(a);
        const bi = presetOrder.indexOf(b);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }),
    [sizes, presetOrder],
  );
  const orderedColors = useMemo(
    () => COLOR_PALETTE.filter((color) => colorCodes.includes(color.code)),
    [colorCodes],
  );

  const existingKeys = useMemo(() => new Set(existing.map((variant) => `${variant.size}\u0000${variant.color}`)), [existing]);

  const rows = useMemo(
    () =>
      orderedSizes.flatMap((size) =>
        orderedColors.map((color) => {
          const key = `${size}\u0000${color.code}`;
          const override = overrides[key] ?? {};
          return {
            key,
            size,
            color,
            alreadyExists: existingKeys.has(`${size}\u0000${color.name}`),
            priceText: override.price ?? price,
            compareAtText: override.compareAt ?? compareAt,
            stockText: override.stock ?? stock,
          };
        }),
      ),
    [orderedSizes, orderedColors, overrides, price, compareAt, stock, existingKeys],
  );

  const activeRows = rows.filter((row) => !row.alreadyExists);
  const tooMany = activeRows.length > MAX_BULK_VARIANTS;

  const payload =
    activeRows.length === 0
      ? ""
      : JSON.stringify({
          material: material.trim(),
          lowStockThreshold: parseInteger(lowStock) ?? 5,
          isActive: true,
          rows: activeRows.map((row) => ({
            size: row.size,
            colorCode: row.color.code,
            priceToman: parseInteger(row.priceText),
            compareAtPriceToman: parseInteger(row.compareAtText),
            stock: parseInteger(row.stockText),
          })),
        });

  const toggleSize = (size: string) =>
    setSizes((current) => (current.includes(size) ? current.filter((value) => value !== size) : [...current, size]));

  const addCustomSize = () => {
    const value = customSize.trim().slice(0, MAX_SIZE_LENGTH);
    if (!value) return;
    setSizes((current) => (current.includes(value) ? current : [...current, value]));
    setCustomSize("");
  };

  const setOverride = (key: string, patch: RowOverride) =>
    setOverrides((current) => ({ ...current, [key]: { ...current[key], ...patch } }));

  const skuPreview = (size: string, colorCode: string) => {
    const color = getPaletteColor(colorCode)!;
    return buildVariantSku(productCode ?? "کد", size, { name: color.name, hex: color.hex });
  };

  const missingPrice = activeRows.some((row) => parseInteger(row.priceText) === null);
  const missingStock = activeRows.some((row) => parseInteger(row.stockText) === null);

  return (
    <div className="flex flex-col gap-5">
      <input type="hidden" name="variantsJson" value={payload} />

      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
        <legend className="mb-1 p-0 text-[0.84rem] font-bold text-ink">۱. سایزها را انتخاب کنید</legend>
        {SIZE_PRESETS.map((preset) => (
          <div key={preset.id} className="flex flex-col gap-1.5">
            <span className="text-[0.76rem] text-text-secondary">{preset.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {preset.sizes.map((size) => {
                const isOn = sizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => toggleSize(size)}
                    className={`min-w-[2.75rem] cursor-pointer rounded-full border px-3.5 py-1.5 text-[0.82rem] transition-colors ${
                      isOn ? "border-ink bg-ink font-semibold text-white" : "border-line bg-white text-ink hover:border-ink/40"
                    }`}
                    dir="auto"
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[10rem] flex-1">
            <TextField
              label="سایز دلخواه"
              name="customSizeDraft"
              optional
              value={customSize}
              maxLength={MAX_SIZE_LENGTH}
              placeholder="مثلاً ۲ سال یا ۴۸"
              onChange={(event) => setCustomSize(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomSize();
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={addCustomSize}
            className="mb-px cursor-pointer rounded-full border border-ink/20 bg-white px-4 py-2.5 text-[0.82rem] font-semibold text-ink hover:border-ink/40"
          >
            افزودن
          </button>
        </div>

        {orderedSizes.some((size) => !presetOrder.includes(size)) && (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {orderedSizes
              .filter((size) => !presetOrder.includes(size))
              .map((size) => (
                <li key={size} className="inline-flex items-center gap-1.5 rounded-full bg-ink py-1 ps-3 pe-1 text-[0.8rem] font-semibold text-white">
                  {size}
                  <button
                    type="button"
                    aria-label={`حذف سایز ${size}`}
                    onClick={() => toggleSize(size)}
                    className="grid h-5 w-5 cursor-pointer place-items-center rounded-full hover:bg-white/20"
                  >
                    <CloseIcon width={12} height={12} />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </fieldset>

      <div className="flex flex-col gap-2">
        <span className="text-[0.84rem] font-bold text-ink">۲. رنگ‌ها را انتخاب کنید</span>
        <ColorPalettePicker label="رنگ‌ها" selected={colorCodes} onChange={setColorCodes} />
      </div>

      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
        <legend className="mb-1 p-0 text-[0.84rem] font-bold text-ink">۳. قیمت و موجودی (برای همه؛ بعداً در جدول قابل تغییر هر ردیف)</legend>
        <div className={`grid gap-4 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
          <TextField
            label="قیمت فروش"
            name="bulkPrice"
            inputMode="numeric"
            suffix="تومان"
            required={activeRows.length > 0}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
          <TextField
            label="قیمت قبل از تخفیف"
            name="bulkCompareAt"
            inputMode="numeric"
            suffix="تومان"
            optional
            value={compareAt}
            onChange={(event) => setCompareAt(event.target.value)}
          />
          <TextField
            label="موجودی هر ردیف"
            name="bulkStock"
            inputMode="numeric"
            suffix="عدد"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
          />
          <TextField
            label="آستانه کمبود"
            name="bulkLowStock"
            inputMode="numeric"
            suffix="عدد"
            value={lowStock}
            onChange={(event) => setLowStock(event.target.value)}
          />
        </div>
        <TextField label="جنس" name="bulkMaterial" optional placeholder="پنبه" value={material} onChange={(event) => setMaterial(event.target.value)} />
      </fieldset>

      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-[0.84rem] font-bold text-ink">
            {activeRows.length.toLocaleString("fa-IR")} نوع ساخته می‌شود
            {rows.length !== activeRows.length && (
              <span className="font-normal text-text-secondary"> ({(rows.length - activeRows.length).toLocaleString("fa-IR")} ترکیب از قبل وجود دارد و رد می‌شود)</span>
            )}
          </p>
          <TableCard className="border-line">
            <table className={`${TABLE} min-w-[640px]`}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>سایز</th>
                  <th className={TH}>رنگ</th>
                  <th className={TH}>کد کالا (SKU)</th>
                  <th className={TH}>قیمت (تومان)</th>
                  <th className={TH}>موجودی</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className={`${TR} ${row.alreadyExists ? "opacity-50" : ""}`}>
                    <td className={`${TD} font-medium`} dir="auto">
                      {row.size}
                    </td>
                    <td className={TD}>
                      <span className="inline-flex items-center gap-2">
                        <Swatch hex={row.color.hex} size={16} />
                        {row.color.name}
                      </span>
                    </td>
                    <td className={`${TD} text-[0.78rem]`} dir="ltr">
                      <span className="block text-end">{skuPreview(row.size, row.color.code)}</span>
                    </td>
                    {row.alreadyExists ? (
                      <td className={TD} colSpan={2}>
                        از قبل ثبت شده
                      </td>
                    ) : (
                      <>
                        <td className={TD}>
                          <input
                            aria-label={`قیمت ${row.size} ${row.color.name}`}
                            inputMode="numeric"
                            dir="ltr"
                            value={row.priceText}
                            onChange={(event) => setOverride(row.key, { price: event.target.value })}
                            className="w-28 rounded-[var(--radius-md)] border border-line bg-white px-2.5 py-1.5 text-end text-[0.82rem]"
                          />
                        </td>
                        <td className={TD}>
                          <input
                            aria-label={`موجودی ${row.size} ${row.color.name}`}
                            inputMode="numeric"
                            dir="ltr"
                            value={row.stockText}
                            onChange={(event) => setOverride(row.key, { stock: event.target.value })}
                            className="w-20 rounded-[var(--radius-md)] border border-line bg-white px-2.5 py-1.5 text-end text-[0.82rem]"
                          />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
          {productCode === undefined && (
            <p className="m-0 text-[0.76rem] text-text-secondary">
              «کد» در SKU پس از ساخت محصول با کد کالای واقعی جایگزین می‌شود.
            </p>
          )}
          {tooMany && (
            <p role="alert" className="m-0 text-[0.8rem] text-red-700">
              حداکثر {MAX_BULK_VARIANTS.toLocaleString("fa-IR")} نوع در هر بار قابل ثبت است؛ تعداد سایز یا رنگ را کمتر کنید.
            </p>
          )}
          {(missingPrice || missingStock) && activeRows.length > 0 && (
            <p role="alert" className="m-0 text-[0.8rem] text-red-700">
              {missingPrice ? "قیمت همه‌ی ردیف‌ها را وارد کنید. " : ""}
              {missingStock ? "موجودی همه‌ی ردیف‌ها را وارد کنید (۰ هم قابل قبول است)." : ""}
            </p>
          )}
        </div>
      )}

    </div>
  );
}
