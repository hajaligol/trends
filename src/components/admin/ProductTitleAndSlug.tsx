"use client";

import { useState } from "react";
import type { AdminProductDetail } from "@/domains/catalog/admin-queries";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { slugifyTitle } from "@/domains/catalog/slug";
import { FieldGrid, TextField } from "@/components/admin/ui/form";

/**
 * Title + URL slug + (for existing products) the read-only product code.
 * On create the slug is only previewed — the server generates the real one
 * from the title. On edit it is shown as an editable field that is NOT
 * re-derived from the title, so renaming a product never breaks its URL.
 */
export function TitleAndSlug({ product }: { product?: AdminProductDetail }) {
  const [title, setTitle] = useState(product?.title ?? "");
  const preview = slugifyTitle(title);

  return (
    <>
      <FieldGrid>
        <TextField
          label="عنوان محصول"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          placeholder="مثال: پیراهن کلاسیک مردانه"
        />
        {product ? (
          <TextField
            label="نامک (بخشی از آدرس صفحه)"
            name="slug"
            defaultValue={product.slug}
            hint="با تغییر نامک، آدرس صفحه محصول هم عوض می‌شود (آدرس قبلی به آدرس جدید هدایت می‌شود). حروف فارسی یا انگلیسی کوچک، عدد و خط تیره؛ بدون فاصله."
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.84rem] font-medium text-ink">نامک (آدرس صفحه)</span>
            <output
              dir="rtl"
              aria-live="polite"
              className="flex min-h-[46px] items-center rounded-[var(--radius-md)] border border-dashed border-ink/20 bg-bg px-4 py-2.5 text-start text-[0.88rem] text-text-secondary"
            >
              {preview || "از روی عنوان ساخته می‌شود"}
            </output>
            <p className="m-0 text-[0.76rem] leading-5 text-text-secondary">خودکار از عنوان ساخته می‌شود؛ اگر تکراری باشد شماره به انتهایش اضافه می‌شود.</p>
          </div>
        )}
      </FieldGrid>
      {product ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-md)] border border-line bg-bg px-4 py-3 text-[0.84rem]">
          <span className="text-text-secondary">کد کالا</span>
          <span className="font-bold text-ink">{toPersianDigits(product.productCode)}</span>
          <span className="text-[0.76rem] text-text-secondary">(خودکار؛ قابل ویرایش نیست — در جستجوی مدیریت و فروشگاه استفاده می‌شود)</span>
        </div>
      ) : null}
    </>
  );
}
