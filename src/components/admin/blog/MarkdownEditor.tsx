"use client";

import { useRef, useState } from "react";
import { MarkdownContent } from "@/components/blog/MarkdownContent";
import { imageSpecHint } from "@/lib/media/image-specs";
import { Spinner } from "@/components/admin/ui/form";
import { ADMIN_CONTROL } from "@/components/admin/ui/layout";

const TABLE_TEMPLATE = "\n| ستون اول | ستون دوم | ستون سوم |\n| --- | --- | --- |\n| مقدار | مقدار | مقدار |\n| مقدار | مقدار | مقدار |\n";

type Snippet = { label: string; title: string; before: string; after?: string; placeholder: string; block?: boolean };

const SNIPPETS: Snippet[] = [
  { label: "H2", title: "عنوان بخش", before: "\n## ", placeholder: "عنوان بخش", block: true },
  { label: "H3", title: "زیرعنوان", before: "\n### ", placeholder: "زیرعنوان", block: true },
  { label: "B", title: "پررنگ", before: "**", after: "**", placeholder: "متن پررنگ" },
  { label: "I", title: "مورب", before: "*", after: "*", placeholder: "متن مورب" },
  { label: "لینک", title: "لینک", before: "[", after: "](https://)", placeholder: "متن لینک" },
  { label: "• فهرست", title: "فهرست گلوله‌ای", before: "\n- ", placeholder: "مورد اول\n- مورد دوم", block: true },
  { label: "۱. فهرست", title: "فهرست شماره‌دار", before: "\n1. ", placeholder: "مورد اول\n2. مورد دوم", block: true },
  { label: "نقل‌قول", title: "نقل‌قول", before: "\n> ", placeholder: "متن نقل‌قول", block: true },
];

const BUTTON = "rounded-[8px] border border-line bg-white px-2.5 py-1.5 text-[0.78rem] font-semibold text-ink transition-colors hover:bg-ink/5 disabled:opacity-50";

/**
 * Markdown editor: toolbar (headings, emphasis, link, lists, quote, table, image upload) +
 * a live preview that uses the exact renderer the storefront uses, so what the operator sees
 * (tables, images, heading numbering) is what readers get. It is a plain controlled
 * `<textarea name="content">`: the form submits the Markdown text and the server validates it.
 */
export function MarkdownEditor({ name = "content", defaultValue = "", error }: { name?: string; defaultValue?: string; error?: string | null }) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function insert(before: string, after: string, placeholder: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || placeholder;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    setValue(next);
    requestAnimationFrame(() => {
      el?.focus();
      const from = start + before.length;
      el?.setSelectionRange(from, from + selected.length);
    });
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.set("folder", "blog");
      body.set("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const json = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !json.url) {
        setUploadError(json.error ?? "بارگذاری تصویر ناموفق بود");
        return;
      }
      // The alt text is part of the SEO value of an image: the placeholder is selected so it is typed over.
      insert("\n\n![", `](${json.url} "توضیح زیر تصویر (اختیاری)")\n\n`, "توضیح تصویر برای موتورهای جستجو");
    } catch {
      setUploadError("بارگذاری تصویر ناموفق بود");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span id={`${name}-label`} className="text-[0.84rem] font-medium text-ink">
          متن مقاله <span aria-hidden="true" className="text-red-600">*</span>
        </span>
        <div role="tablist" aria-label="حالت ویرایشگر" className="flex gap-1 rounded-full border border-line bg-white p-1">
          {(["write", "preview"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-full px-4 py-1 text-[0.8rem] font-semibold transition-colors ${tab === id ? "bg-ink text-white" : "text-ink/70 hover:text-ink"}`}
            >
              {id === "write" ? "نوشتن" : "پیش‌نمایش"}
            </button>
          ))}
        </div>
      </div>

      {/* The textarea stays mounted in both tabs so its value is always submitted. */}
      <div className={tab === "write" ? "flex flex-col gap-2" : "hidden"}>
        <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="ابزار قالب‌بندی">
          {SNIPPETS.map((snippet) => (
            <button key={snippet.label} type="button" title={snippet.title} onClick={() => insert(snippet.before, snippet.after ?? "", snippet.placeholder)} className={BUTTON}>
              {snippet.label}
            </button>
          ))}
          <button type="button" title="جدول" onClick={() => insert(TABLE_TEMPLATE, "", "")} className={BUTTON}>
            جدول
          </button>
          <button type="button" title="بارگذاری و درج تصویر" disabled={uploading} onClick={() => fileRef.current?.click()} className={`${BUTTON} inline-flex items-center gap-1.5`}>
            {uploading && <Spinner />}
            تصویر
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/tiff,image/gif" className="sr-only" tabIndex={-1} onChange={handleFile} />
        </div>

        <textarea
          ref={textareaRef}
          id={name}
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          required
          rows={22}
          spellCheck
          aria-labelledby={`${name}-label`}
          className={`${ADMIN_CONTROL} min-h-[420px] font-mono text-[0.9rem] leading-8`}
          placeholder={"## عنوان بخش اول\n\nمتن مقاله را با Markdown بنویسید…"}
        />
        <p className="m-0 text-[0.76rem] leading-5 text-text-secondary">
          عنوان‌های <bdi dir="ltr">##</bdi> و <bdi dir="ltr">###</bdi> به‌طور خودکار «فهرست مطالب» را می‌سازند. جدول و تصویر از دکمه‌های بالا اضافه می‌شوند؛ فقط تصاویر بارگذاری‌شده در سایت نمایش داده می‌شوند (به‌صورت خودکار به WebP زیر ۵۰ کیلوبایت تبدیل می‌شوند). تصویر داخل مقاله — {imageSpecHint("blogInline")} HTML خام پشتیبانی نمی‌شود.
        </p>
        {uploadError && (
          <p role="alert" className="m-0 text-[0.8rem] text-red-700">
            {uploadError}
          </p>
        )}
      </div>

      {tab === "preview" && (
        <div className="min-h-[420px] rounded-[var(--radius-md)] border border-line bg-white p-5 sm:p-6">
          {value.trim() ? <MarkdownContent>{value}</MarkdownContent> : <p className="m-0 text-text-secondary">هنوز متنی نوشته نشده است.</p>}
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 text-[0.8rem] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
