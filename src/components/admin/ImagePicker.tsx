"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon } from "@/components/admin/ui/icons";
import { Spinner } from "@/components/admin/ui/form";
import { IMAGE_SPECS, imageSpecHint, type ImageSpecKind } from "@/lib/media/image-specs";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type ImagePickerProps = {
  /** Form field name the resulting URL is submitted under (e.g. "url"
   * for `product_images`, "imageUrl" for hero slides/categories/banners)
   * — the surrounding `<form>`'s Server Action reads this exactly like
   * it used to read the plain text `FormField` this component replaces. */
  name: string;
  /** Which `ALLOWED_FOLDERS` bucket (`src/app/api/admin/media/route.ts`)
   * this picker uploads into. */
  folder: "products" | "hero" | "categories" | "banners" | "brands" | "blog";
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  /** Which storefront slot this image fills. Drives the preview tile's shape
   * and the always-visible "recommended aspect ratio" hint
   * (`lib/media/image-specs.ts`). */
  kind: ImageSpecKind;
  /** Extra guidance shown after the aspect-ratio hint. */
  hint?: string;
  /** Called with the new URL ("" when removed) whenever it changes — for
   * controlled forms that don't submit this field as a plain `<form>` value. */
  onChange?: (url: string) => void;
};

/** Preview tile width per orientation — the height follows from the spec's ratio. */
function previewWidth(kind: ImageSpecKind): string {
  const { width, height } = IMAGE_SPECS[kind];
  if (width / height >= 1.5) return "11rem";
  if (width / height <= 0.9) return "6.5rem";
  return "7rem";
}

function formatKb(bytes: number): string {
  return `${toPersianDigits(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`;
}

/**
 * Browse-for-a-file image picker: a visible preview tile (click to choose)
 * opens the OS file picker, the chosen file uploads immediately to
 * `POST /api/admin/media`, and the returned URL is written into a hidden
 * input under `name` so the surrounding form's existing Server Action
 * needs no changes — it still just reads a URL string.
 *
 * A manual "یا آدرس تصویر را وارد کنید" fallback stays available
 * (collapsed by default) for the case an operator wants to reuse a URL
 * that already exists (e.g. an old product's image on another page)
 * without re-uploading it — the browse button is the primary path, not
 * the only path.
 */
export function ImagePicker({ name, folder, label, defaultValue, required, kind, hint, onChange }: ImagePickerProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrlState] = useState(defaultValue ?? "");
  const setUrl = (next: string) => {
    setUrlState(next);
    onChange?.(next);
  };
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const spec = IMAGE_SPECS[kind];

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadInfo(null);
    setIsUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("folder", folder);

      const response = await fetch("/api/admin/media", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
        originalBytes?: number;
        finalBytes?: number;
        converted?: boolean;
      } | null;

      if (!response.ok || !data?.url) {
        setError(data?.error ?? "آپلود تصویر با خطا مواجه شد");
        return;
      }
      setUrl(data.url);
      if (data.converted && data.originalBytes && data.finalBytes) {
        setUploadInfo(`به WebP تبدیل شد: ${formatKb(data.originalBytes)} ← ${formatKb(data.finalBytes)}`);
      } else if (data.converted === false) {
        setUploadInfo("فایل GIF بدون تغییر ذخیره شد.");
      }
    } catch {
      setError("ارتباط با سرور برای آپلود تصویر برقرار نشد");
    } finally {
      setIsUploading(false);
      // Allow re-selecting the same file again later (e.g. after removing it).
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2 text-[0.84rem] font-medium text-ink">
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-600">
            *
          </span>
        )}
      </span>

      <input type="hidden" name={name} value={url} required={required} />

      <div className="flex flex-wrap items-center gap-4">
        <label
          htmlFor={inputId}
          className={`relative grid shrink-0 cursor-pointer place-items-center overflow-hidden rounded-[var(--radius-md)] border border-dashed border-ink/25 bg-card-image transition-colors hover:border-brand has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand/50`}
          style={{ width: previewWidth(kind), aspectRatio: `${spec.width} / ${spec.height}` }}
        >
          {url ? (
            <Image src={url} alt="" fill sizes="176px" className="object-cover" unoptimized={url.endsWith(".gif")} />
          ) : (
            <span className="flex flex-col items-center gap-1 px-2 text-center text-[0.72rem] text-text-secondary">
              <ImageIcon width={24} height={24} />
              انتخاب تصویر
            </span>
          )}
          {isUploading && (
            <span className="absolute inset-0 grid place-items-center bg-white/75">
              <Spinner className="h-6 w-6 text-brand" />
            </span>
          )}
          <input
            id={inputId}
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/tiff,image/gif"
            onChange={handleFileChange}
            disabled={isUploading}
            className="sr-only"
          />
        </label>

        <div className="flex flex-col items-start gap-1.5">
          <label
            htmlFor={inputId}
            className="cursor-pointer rounded-full border border-ink/20 bg-white px-4 py-2 text-[0.82rem] font-semibold text-ink transition-colors hover:border-ink/40 hover:bg-ink/[0.04]"
          >
            {isUploading ? "در حال آپلود..." : url ? "تغییر تصویر" : "انتخاب فایل"}
          </label>
          {url && (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="cursor-pointer rounded-full px-1 text-[0.78rem] text-red-700 hover:underline"
            >
              حذف تصویر
            </button>
          )}
          <p className="m-0 max-w-[26rem] text-[0.74rem] font-medium leading-5 text-ink/80">{imageSpecHint(kind)}</p>
          <p className="m-0 max-w-[26rem] text-[0.72rem] leading-5 text-text-secondary">
            {hint ? `${hint} ` : ""}هر قالبی (JPG، PNG، WebP، AVIF…) قابل آپلود است؛ تصویر خودکار به WebP با حجم کمتر از ۵۰ کیلوبایت تبدیل می‌شود (GIF بدون تغییر می‌ماند).
          </p>
          {uploadInfo && (
            <p role="status" className="m-0 text-[0.72rem] leading-5 text-emerald-700">
              {uploadInfo}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="m-0 text-[0.78rem] text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowUrlFallback((value) => !value)}
        className="w-fit cursor-pointer text-[0.76rem] text-text-secondary underline underline-offset-2 hover:text-brand"
      >
        {showUrlFallback ? "بستن" : "یا آدرس تصویر را وارد کنید"}
      </button>
      {showUrlFallback && (
        <input
          type="text"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="/assets/products/example.webp"
          dir="ltr"
          aria-label="آدرس تصویر"
          className="w-full rounded-[var(--radius-md)] border border-line bg-white px-4 py-2.5 text-[0.85rem] text-ink outline-none transition-colors focus:border-brand focus:outline-2 focus:outline-offset-1 focus:outline-brand/30"
        />
      )}
    </div>
  );
}
