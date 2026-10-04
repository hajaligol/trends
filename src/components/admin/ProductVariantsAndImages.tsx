"use client";

import Image from "next/image";
import { useState } from "react";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { VariantForm } from "@/components/admin/VariantForm";
import { createImageAction, deleteImageAction, deleteVariantAction } from "@/domains/catalog/admin-actions";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import type { ProductImage, ProductVariant } from "@/lib/db/schema";
import type { ActionResult } from "@/domains/auth/roles";
import { adminButton, Card, StatusBadge, TABLE, TD, TH, THEAD, TR, TableCard } from "@/components/admin/ui/layout";
import { ImageIcon, PencilIcon, PlusIcon } from "@/components/admin/ui/icons";
import { AdminSubmitButton, FieldGrid, FormAlert, SelectField, SwitchField, TextField, useAdminAction } from "@/components/admin/ui/form";

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
  const [isAddingImage, setIsAddingImage] = useState(false);

  return (
    <>
      <Card
        id="variants"
        title="انواع محصول (سایز و رنگ)"
        description="هر ترکیب سایز/رنگ، قیمت و موجودی خودش را دارد. محصولی که هیچ نوعی نداشته باشد در فروشگاه قابل خرید نیست."
        actions={
          !isAddingVariant && (
            <button type="button" onClick={() => setIsAddingVariant(true)} className={adminButton("secondary", "sm")}>
              <PlusIcon width={16} height={16} />
              نوع جدید
            </button>
          )
        }
      >
        <div className="flex flex-col gap-4">
          {isAddingVariant && (
            <VariantForm productId={productId} onDone={() => setIsAddingVariant(false)} onCancel={() => setIsAddingVariant(false)} />
          )}

          {variants.length === 0 ? (
            !isAddingVariant && (
              <p className="m-0 rounded-[var(--radius-md)] border border-dashed border-ink/15 px-4 py-8 text-center text-[0.86rem] leading-7 text-text-secondary">
                این محصول هنوز نوعی ندارد. با «نوع جدید» اولین سایز/رنگ را اضافه کنید.
              </p>
            )
          ) : (
            <TableCard className="border-line">
              <table className={`${TABLE} min-w-[720px]`}>
                <thead className={THEAD}>
                  <tr>
                    <th className={TH}>کد کالا</th>
                    <th className={TH}>سایز</th>
                    <th className={TH}>رنگ</th>
                    <th className={TH}>قیمت</th>
                    <th className={TH}>موجودی</th>
                    <th className={TH}>وضعیت</th>
                    <th className={TH}>
                      <span className="sr-only">عملیات</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant) =>
                    editingVariantId === variant.id ? (
                      <tr key={variant.id}>
                        <td colSpan={7} className="p-3 sm:p-4">
                          <VariantForm
                            productId={productId}
                            variant={variant}
                            onDone={() => setEditingVariantId(null)}
                            onCancel={() => setEditingVariantId(null)}
                          />
                        </td>
                      </tr>
                    ) : (
                      <tr key={variant.id} className={TR}>
                        <td className={`${TD} text-[0.8rem]`} dir="ltr">
                          <span className="block text-end">{variant.sku}</span>
                        </td>
                        <td className={`${TD} font-medium`}>{variant.size}</td>
                        <td className={TD}>
                          <span className="inline-flex items-center gap-2">
                            {variant.colorHex && (
                              <span aria-hidden="true" style={{ backgroundColor: variant.colorHex }} className="h-4 w-4 rounded-full border border-ink/15" />
                            )}
                            {variant.color}
                          </span>
                        </td>
                        <td className={TD}>
                          <span className="block font-semibold">{formatToman(variant.priceToman)}</span>
                          {variant.compareAtPriceToman && variant.compareAtPriceToman > variant.priceToman && (
                            <span className="block text-[0.76rem] text-text-secondary line-through">{formatToman(variant.compareAtPriceToman)}</span>
                          )}
                        </td>
                        <td className={TD}>
                          {variant.stock === 0 ? (
                            <StatusBadge tone="danger">ناموجود</StatusBadge>
                          ) : variant.stock <= variant.lowStockThreshold ? (
                            <StatusBadge tone="warning">{toPersianDigits(variant.stock)} · رو به اتمام</StatusBadge>
                          ) : (
                            toPersianDigits(variant.stock)
                          )}
                        </td>
                        <td className={TD}>
                          <StatusBadge tone={variant.isActive ? "success" : "neutral"}>{variant.isActive ? "فعال" : "غیرفعال"}</StatusBadge>
                        </td>
                        <td className={TD}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingVariantId(variant.id)}
                              aria-label={`ویرایش ${variant.size} / ${variant.color}`}
                              title="ویرایش"
                              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]"
                            >
                              <PencilIcon width={17} height={17} />
                            </button>
                            <ConfirmButton
                              trigger="icon"
                              action={() => deleteVariantAction(variant.id)}
                              title="حذف نوع محصول"
                              confirmMessage={`نوع «${variant.size} / ${variant.color}» (${variant.sku}) حذف شود؟ سفارش‌های قبلی که این نوع را داشته‌اند تغییری نمی‌کنند.`}
                              label={`حذف ${variant.size} / ${variant.color}`}
                              successMessage="نوع محصول حذف شد"
                            />
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </TableCard>
          )}
        </div>
      </Card>

      <Card
        id="images"
        title="تصاویر محصول"
        description="تصویر اصلی در کارت محصول و ابتدای گالری نمایش داده می‌شود. اگر تصویری نباشد، یک جای‌نما دیده می‌شود."
        actions={
          !isAddingImage && (
            <button type="button" onClick={() => setIsAddingImage(true)} className={adminButton("secondary", "sm")}>
              <PlusIcon width={16} height={16} />
              تصویر جدید
            </button>
          )
        }
      >
        <div className="flex flex-col gap-5">
          {isAddingImage && <ImageAddForm productId={productId} variants={variants} onClose={() => setIsAddingImage(false)} />}

          {images.length === 0 ? (
            !isAddingImage && (
              <p className="m-0 flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-ink/15 px-4 py-8 text-center text-[0.86rem] leading-7 text-text-secondary">
                <ImageIcon width={26} height={26} />
                این محصول هنوز تصویری ندارد.
              </p>
            )
          ) : (
            <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((image) => (
                <li key={image.id} className="flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-line bg-white">
                  <div className="relative aspect-[3/4] bg-card-image">
                    <Image src={image.url} alt={image.altText} fill sizes="(min-width: 1024px) 220px, 45vw" className="object-cover" />
                    {image.isPrimary && (
                      <span className="absolute start-2 top-2 rounded-full bg-ink px-2.5 py-1 text-[0.7rem] font-semibold text-white">اصلی</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 p-2.5">
                    <span className="truncate text-[0.76rem] text-text-secondary" title={image.altText}>
                      {image.altText}
                    </span>
                    <ConfirmButton
                      trigger="icon"
                      action={() => deleteImageAction(image.id)}
                      title="حذف تصویر"
                      confirmMessage="این تصویر از محصول حذف شود؟"
                      label="حذف تصویر"
                      successMessage="تصویر حذف شد"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}

const imageInitialState: ActionResult = { ok: true };

function ImageAddForm({ productId, variants, onClose }: { productId: string; variants: ProductVariant[]; onClose: () => void }) {
  // Bumping the key remounts the form, which clears the file picker and
  // fields after a successful add so the next image starts blank.
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useAdminAction(createImageAction, imageInitialState, {
    successMessage: "تصویر اضافه شد",
    onSuccess: () => setFormKey((value) => value + 1),
  });

  return (
    <form
      key={formKey}
      action={formAction}
      className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-line bg-bg p-4 sm:p-5"
    >
      <input type="hidden" name="productId" value={productId} />
      <FormAlert state={state} />

      <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
        <ImagePicker name="url" folder="products" label="تصویر" shape="portrait" required />
        <div className="flex flex-col gap-4">
          <TextField label="متن جایگزین (alt)" name="altText" required hint="توضیح کوتاه تصویر برای نابینایان و موتورهای جستجو؛ مثلاً «پیراهن آبی از روبه‌رو»." />
          <FieldGrid>
            <SelectField label="مخصوص کدام نوع؟" name="variantId" defaultValue="" optional hint="اگر خالی بماند، برای همه انواع نمایش داده می‌شود.">
              <option value="">همه انواع</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.size} / {variant.color}
                </option>
              ))}
            </SelectField>
            <TextField label="ترتیب نمایش" name="displayOrder" type="number" defaultValue="0" hint="عدد کوچک‌تر، زودتر." />
          </FieldGrid>
          <SwitchField name="isPrimary" label="تصویر اصلی" description="در کارت محصول نمایش داده می‌شود." />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <AdminSubmitButton pendingLabel="در حال افزودن...">افزودن تصویر</AdminSubmitButton>
        <button type="button" onClick={onClose} className={adminButton("ghost", "md")}>
          بستن
        </button>
      </div>
    </form>
  );
}
