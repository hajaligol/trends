"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { VariantForm } from "@/components/admin/VariantForm";
import { createImageAction, deleteImageAction, deleteVariantAction } from "@/domains/catalog/admin-actions";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import type { ProductImage, ProductVariant } from "@/lib/db/schema";
import type { ActionResult } from "@/domains/auth/roles";

/**
 * Variant + image management for a single product's edit page. Kept as
 * one client component (not split into a page-level Server
 * Component per row) since every row needs its own inline
 * edit-toggle/local state — the same "small, self-contained client
 * islands inside an otherwise server-rendered page" shape as
 * `CategoryRow`/`ConfirmButton`.
 */
export function ProductVariantsAndImages({
  productId,
  variants,
  images,
}: {
  productId: string;
  variants: ProductVariant[];
  images: ProductImage[];
}) {
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[1rem] font-bold text-ink">انواع محصول (سایز / رنگ)</h2>
          {!isAddingVariant && (
            <button
              type="button"
              onClick={() => setIsAddingVariant(true)}
              className="text-[0.82rem] underline underline-offset-2"
            >
              + افزودن نوع جدید
            </button>
          )}
        </div>

        {isAddingVariant && (
          <VariantForm productId={productId} onDone={() => setIsAddingVariant(false)} />
        )}

        {variants.length === 0 ? (
          <p className="text-[0.85rem] text-text-secondary">
            این محصول هنوز هیچ نوعی (سایز/رنگ) ندارد و در فروشگاه غیرقابل خرید است.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line">
            <table className="w-full min-w-[640px] text-[0.85rem]">
              <thead>
                <tr className="border-b border-line bg-header text-text-secondary">
                  <th className="px-4 py-2.5 text-start font-medium">SKU</th>
                  <th className="px-4 py-2.5 text-start font-medium">سایز/رنگ</th>
                  <th className="px-4 py-2.5 text-start font-medium">قیمت</th>
                  <th className="px-4 py-2.5 text-start font-medium">موجودی</th>
                  <th className="px-4 py-2.5 text-start font-medium">وضعیت</th>
                  <th className="px-4 py-2.5 text-start font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant) =>
                  editingVariantId === variant.id ? (
                    <tr key={variant.id}>
                      <td colSpan={6} className="px-4 py-4">
                        <VariantForm productId={productId} variant={variant} onDone={() => setEditingVariantId(null)} />
                        <button
                          type="button"
                          onClick={() => setEditingVariantId(null)}
                          className="mt-2 text-[0.8rem] text-text-secondary underline underline-offset-2"
                        >
                          انصراف
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={variant.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5" dir="ltr">
                        {variant.sku}
                      </td>
                      <td className="px-4 py-2.5">
                        {variant.size} / {variant.color}
                      </td>
                      <td className="px-4 py-2.5">{formatToman(variant.priceToman)}</td>
                      <td className="px-4 py-2.5">{toPersianDigits(variant.stock)}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-3 py-1 text-[0.75rem] ${
                            variant.isActive ? "bg-sage text-ink" : "bg-header text-text-secondary"
                          }`}
                        >
                          {variant.isActive ? "فعال" : "غیرفعال"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setEditingVariantId(variant.id)}
                            className="text-[0.8rem] underline underline-offset-2"
                          >
                            ویرایش
                          </button>
                          <ConfirmButton
                            action={() => deleteVariantAction(variant.id)}
                            confirmMessage="این نوع محصول حذف شود؟"
                            label="حذف"
                          />
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[1rem] font-bold text-ink">تصاویر محصول</h2>
        <ImageAddForm productId={productId} variants={variants} />

        {images.length === 0 ? (
          <p className="text-[0.85rem] text-text-secondary">
            این محصول هنوز تصویری ندارد و در فروشگاه به‌جای عکس، جایگزین (placeholder) نمایش داده می‌شود.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {images.map((image) => (
              <li
                key={image.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line bg-white px-4 py-3 text-[0.85rem]"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-card-image">
                    <Image src={image.url} alt="" fill sizes="48px" className="object-cover" />
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="truncate" dir="ltr">
                      {image.url}
                    </span>
                    <span className="text-text-secondary">
                      {image.altText} {image.isPrimary ? "· تصویر اصلی" : ""}
                    </span>
                  </div>
                </div>
                <ConfirmButton action={() => deleteImageAction(image.id)} confirmMessage="این تصویر حذف شود؟" label="حذف" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const imageInitialState: ActionResult = { ok: true };

function ImageAddForm({ productId, variants }: { productId: string; variants: ProductVariant[] }) {
  const [state, formAction] = useActionState(createImageAction, imageInitialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-line bg-header p-4">
      <input type="hidden" name="productId" value={productId} />

      {!state.ok && (
        <p role="alert" className="text-[0.8rem] text-red-700">
          {state.error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <ImagePicker name="url" folder="products" label="تصویر محصول" required />
        <FormField label="متن جایگزین (alt)" name="altText" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.85rem] text-ink">مخصوص کدام نوع؟ (اختیاری)</span>
          <select
            name="variantId"
            defaultValue=""
            className="w-full rounded-[var(--radius-md)] border border-line bg-white px-4 py-3 text-[0.92rem] text-ink outline-none focus:outline-2 focus:outline-ink"
          >
            <option value="">— عمومی (همه انواع) —</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.size} / {variant.color}
              </option>
            ))}
          </select>
        </label>
        <FormField label="ترتیب نمایش" name="displayOrder" type="number" defaultValue="0" />
        <label className="flex items-center gap-2 self-end pb-3 text-[0.85rem] text-ink">
          <input type="checkbox" name="isPrimary" className="h-4 w-4" />
          تصویر اصلی
        </label>
      </div>

      <SubmitButton pendingLabel="در حال افزودن...">افزودن تصویر</SubmitButton>
    </form>
  );
}
