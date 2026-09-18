"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";

type ImagePickerProps = {
  /** Form field name the resulting URL is submitted under (e.g. "url"
   * for `product_images`, "imageUrl" for hero slides/categories/banners)
   * — the surrounding `<form>`'s Server Action reads this exactly like
   * it used to read the plain text `FormField` this component replaces. */
  name: string;
  /** Which `ALLOWED_FOLDERS` bucket (`src/app/api/admin/media/route.ts`)
   * this picker uploads into. */
  folder: "products" | "hero" | "categories" | "banners";
  label: string;
  defaultValue?: string | null;
  required?: boolean;
};

/**
 * Browse-for-a-file image picker: a visible "انتخاب تصویر" button opens
 * the OS file picker, the chosen file uploads immediately to
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
export function ImagePicker({ name, folder, label, defaultValue, required }: ImagePickerProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultValue ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlFallback, setShowUrlFallback] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("folder", folder);

      const response = await fetch("/api/admin/media", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;

      if (!response.ok || !data?.url) {
        setError(data?.error ?? "آپلود تصویر با خطا مواجه شد");
        return;
      }
      setUrl(data.url);
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
      <span className="text-[0.85rem] text-ink">
        {label}
        {required && !url ? " *" : ""}
      </span>

      <input type="hidden" name={name} value={url} required={required} />

      <div className="flex items-center gap-3">
        {url ? (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-line bg-card-image">
            <Image src={url} alt="" fill sizes="64px" className="object-cover" />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-line bg-header text-[0.7rem] text-text-secondary"
          >
            بدون تصویر
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={inputId}
            className="w-fit cursor-pointer rounded-[var(--radius-md)] border border-line bg-white px-4 py-2 text-[0.82rem] text-ink transition-colors hover:bg-header"
          >
            {isUploading ? "در حال آپلود..." : url ? "تغییر تصویر" : "انتخاب تصویر"}
          </label>
          <input
            id={inputId}
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={isUploading}
            className="sr-only"
          />
          {url && (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="w-fit text-[0.78rem] text-text-secondary underline underline-offset-2"
            >
              حذف تصویر
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-[0.78rem] text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowUrlFallback((value) => !value)}
        className="w-fit text-[0.76rem] text-text-secondary underline underline-offset-2"
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
          className="w-full rounded-[var(--radius-md)] border border-line bg-white px-4 py-2.5 text-[0.85rem] text-ink outline-none focus:outline-2 focus:outline-ink"
        />
      )}
    </div>
  );
}
