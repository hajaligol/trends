"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { SelectField, TextField } from "@/components/admin/ui/form";
import { adminButton } from "@/components/admin/ui/layout";
import { MAX_CREATE_PRODUCT_IMAGES } from "@/lib/validation/admin";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import type { DraftImage } from "./validation";

/**
 * Collects photos for a product that does not exist yet. Files upload
 * immediately through `/api/admin/media` (same as the edit page); only the
 * resulting URLs travel with the final `imagesJson` field.
 */
export function ProductImagesStep({
  images,
  onChange,
  colorNames,
}: {
  images: DraftImage[];
  onChange: (images: DraftImage[]) => void;
  /** Colours defined in the variants stage. */
  colorNames: string[];
}) {
  const [pickerKey, setPickerKey] = useState(0);
  const [url, setUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [color, setColor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const full = images.length >= MAX_CREATE_PRODUCT_IMAGES;

  function add() {
    if (!url) return setError("ابتدا یک تصویر انتخاب کنید.");
    if (altText.trim() === "") return setError("متن جایگزین (alt) را وارد کنید.");
    setError(null);
    const isFirst = images.length === 0;
    onChange([...images, { key: `${Date.now()}-${images.length}`, url, altText: altText.trim(), color, isPrimary: isFirst }]);
    setUrl("");
    setAltText("");
    setColor("");
    setPickerKey((value) => value + 1); // remount → clears the file picker
  }

  const setPrimary = (key: string) => onChange(images.map((image) => ({ ...image, isPrimary: image.key === key })));
  const remove = (key: string) => {
    const rest = images.filter((image) => image.key !== key);
    // Removing the primary photo promotes the first remaining one.
    onChange(rest.length > 0 && !rest.some((image) => image.isPrimary) ? rest.map((image, index) => ({ ...image, isPrimary: index === 0 })) : rest);
  };
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const a = images[index];
    const b = images[target];
    if (!a || !b) return;
    const next = [...images];
    next[index] = b;
    next[target] = a;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-5">
      {images.length > 0 && (
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          {images.map((image, index) => (
            <li key={image.key} className="flex gap-3 rounded-[var(--radius-md)] border border-line bg-bg p-3">
              <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-white">
                <Image src={image.url} alt={image.altText} fill sizes="80px" className="object-cover" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className="m-0 truncate text-[0.82rem] font-medium text-ink">{image.altText}</p>
                <p className="m-0 text-[0.74rem] text-text-secondary">
                  {toPersianDigits(index + 1)}. {image.color || "همه‌ی رنگ‌ها"}
                  {image.isPrimary ? " · تصویر اصلی" : ""}
                </p>
                <div className="mt-auto flex flex-wrap gap-1.5">
                  {!image.isPrimary && (
                    <button type="button" onClick={() => setPrimary(image.key)} className={adminButton("secondary", "sm")}>
                      اصلی کن
                    </button>
                  )}
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="انتقال به قبل" className={adminButton("ghost", "sm")}>
                    ↑
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === images.length - 1} aria-label="انتقال به بعد" className={adminButton("ghost", "sm")}>
                    ↓
                  </button>
                  <button type="button" onClick={() => remove(image.key)} className={adminButton("danger", "sm")}>
                    حذف
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="m-0 text-[0.84rem] text-text-secondary">به حداکثر تعداد تصویر ({toPersianDigits(MAX_CREATE_PRODUCT_IMAGES)}) رسیده‌اید؛ بقیه را بعد از ساخت محصول اضافه کنید.</p>
      ) : (
        <div className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-line bg-bg p-4 sm:p-5">
          <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
            <ImagePicker key={pickerKey} name="draftImageUrl" folder="products" label="تصویر" shape="portrait" onChange={setUrl} />
            <div className="flex flex-col gap-4">
              <TextField
                label="متن جایگزین (alt)"
                name="draftImageAlt"
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    add();
                  }
                }}
                hint="توضیح کوتاه تصویر برای نابینایان و موتورهای جستجو؛ مثلاً «پیراهن آبی از روبه‌رو»."
              />
              <SelectField
                label="مخصوص کدام رنگ؟"
                name="draftImageColor"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                optional
                hint={colorNames.length === 0 ? "رنگی در مرحله‌ی «سایز و رنگ» انتخاب نشده؛ تصویر برای همه‌ی رنگ‌ها ثبت می‌شود." : "با انتخاب رنگ، همان تصویر هنگام انتخاب این رنگ در فروشگاه نمایش داده می‌شود."}
              >
                <option value="">همه‌ی رنگ‌ها</option>
                {colorNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
          {error && (
            <p role="alert" className="m-0 text-[0.82rem] text-red-700">
              {error}
            </p>
          )}
          <div>
            <button type="button" onClick={add} className={adminButton("primary", "md")}>
              افزودن به فهرست
            </button>
          </div>
        </div>
      )}
      <p className="m-0 text-[0.78rem] leading-6 text-text-secondary">این مرحله اختیاری است؛ می‌توانید بعداً هم از صفحه‌ی ویرایش محصول تصویر اضافه کنید. اولین تصویر به‌طور پیش‌فرض تصویر اصلی (نمایش در کارت محصول) است.</p>
    </div>
  );
}
