import Link from "next/link";
import type { ReactNode } from "react";
import type { CatalogProductDetail } from "@/domains/catalog/queries";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { normalizeSpecLabel } from "@/lib/utils/spec-label";

type SpecRow = { label: string; value: ReactNode };

/**
 * Content of the product page's «مشخصات محصول» tab. Every row is derived
 * from data the product already has (brand, category, variants' size /
 * color / material, tags) — there is no separate specifications table —
 * and a row is simply omitted when its data is missing, so a sparsely
 * filled product never shows empty labels or "—" placeholders.
 *
 * Rows the admin adds in the product editor are merged in (see below).
 *
 * The product's long description (admin-entered free text) is shown above
 * the table so it isn't lost now that the old standalone description block
 * is gone.
 */
export function ProductSpecs({ product }: { product: CatalogProductDetail }) {
  const { variants } = product;

  const sizes = [...new Set(variants.map((variant) => variant.size))];
  const sellableSizes = new Set(
    variants.filter((variant) => variant.stockState !== "out-of-stock").map((variant) => variant.size),
  );

  const colorMap = new Map<string, string | null>();
  for (const variant of variants) {
    if (!colorMap.has(variant.color)) colorMap.set(variant.color, variant.colorHex);
  }

  const materials = [
    ...new Set(variants.map((variant) => variant.material?.trim()).filter((value): value is string => !!value)),
  ];

  const rows: SpecRow[] = [{ label: "کد کالا", value: toPersianDigits(product.productCode) }];

  if (product.brand) rows.push({ label: "برند", value: product.brand });

  const ownCategory = product.categoryTrail[product.categoryTrail.length - 1];
  if (ownCategory) {
    rows.push({
      label: "دسته‌بندی",
      value: (
        <Link href={`/category/${ownCategory.slug}`} className="underline-offset-4 hover:underline">
          {ownCategory.name}
        </Link>
      ),
    });
  }

  if (materials.length > 0) rows.push({ label: "جنس", value: materials.join("، ") });

  if (sizes.length > 0) {
    rows.push({
      label: "سایزها",
      value: (
        <ul className="flex flex-wrap gap-1.5">
          {sizes.map((size) => (
            <li
              key={size}
              className={`rounded-full border border-line px-3 py-0.5 text-[0.82rem] ${
                sellableSizes.has(size) ? "text-ink" : "text-text-secondary line-through"
              }`}
            >
              {toPersianDigits(size)}
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (colorMap.size > 0) {
    rows.push({
      label: "رنگ‌ها",
      value: (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {[...colorMap.entries()].map(([color, hex]) => (
            <li key={color} className="flex items-center gap-1.5">
              {hex && (
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: hex }}
                  className="h-3.5 w-3.5 rounded-full border border-ink/15"
                />
              )}
              {color}
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (product.tags.length > 0) {
    rows.push({
      label: "برچسب‌ها",
      value: (
        <ul className="flex flex-wrap gap-1.5">
          {product.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-header-bg px-3 py-0.5 text-[0.82rem] text-text-secondary">
              {tag}
            </li>
          ))}
        </ul>
      ),
    });
  }

  // Admin-authored rows: a row whose label matches an automatic row
  // (e.g. «جنس») replaces that row's value in place; any other label is
  // appended in the admin's order.
  for (const custom of product.specifications) {
    const existingIndex = rows.findIndex((row) => normalizeSpecLabel(row.label) === normalizeSpecLabel(custom.label));
    if (existingIndex >= 0) rows[existingIndex] = { label: rows[existingIndex]!.label, value: custom.value };
    else rows.push({ label: custom.label, value: custom.value });
  }

  const hasDescription = !!product.longDescription?.trim();

  if (rows.length === 0 && !hasDescription) {
    return <p className="py-6 text-[0.9rem] text-text-secondary">مشخصاتی برای این محصول ثبت نشده است.</p>;
  }

  // One shared max-width, resolved at the description's font size, so the
  // description and the specs table always have exactly the same width.
  return (
    <div className="flex max-w-[72ch] flex-col gap-6 text-[0.92rem]">
      {hasDescription && (
        <div>
          <h2 className="mb-2.5 text-[1.05rem] font-bold">توضیحات</h2>
          <p className="text-[0.92rem] leading-8 whitespace-pre-line text-ink/85">
            {product.longDescription}
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div>
          <h2 className="sr-only">مشخصات فنی</h2>
          <dl className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-white">
            {rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[minmax(96px,32%)_1fr] border-b border-line last:border-b-0 sm:grid-cols-[200px_1fr]"
              >
                <dt className="bg-header-bg/60 px-4 py-3.5 text-[0.88rem] text-text-secondary sm:px-6">
                  {row.label}
                </dt>
                <dd className="m-0 px-4 py-3.5 text-[0.9rem] text-ink sm:px-6">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
