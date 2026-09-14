"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { createPromoBannerAction, deletePromoBannerAction, updatePromoBannerAction } from "@/domains/content/actions";
import type { PromoBanner } from "@/lib/db/schema";
import type { ActionResult } from "@/domains/auth/roles";

const initialState: ActionResult = { ok: true };

function PromoBannerForm({ banner, onDone }: { banner?: PromoBanner; onDone?: () => void }) {
  const action = banner ? updatePromoBannerAction : createPromoBannerAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onDone?.();
      }}
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-line bg-header p-4"
    >
      {banner && <input type="hidden" name="id" value={banner.id} />}
      {!state.ok && (
        <p role="alert" className="text-[0.8rem] text-red-700">
          {state.error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="عنوان" name="title" defaultValue={banner?.title} required />
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.85rem] text-ink">رنگ</span>
          <select
            name="tone"
            defaultValue={banner?.tone ?? "pink"}
            className="w-full rounded-[var(--radius-md)] border border-line bg-white px-4 py-3 text-[0.92rem] text-ink outline-none focus:outline-2 focus:outline-ink"
          >
            <option value="pink">صورتی</option>
            <option value="blue">آبی</option>
          </select>
        </label>
      </div>
      <FormField label="توضیحات" name="description" defaultValue={banner?.description} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="متن دکمه" name="ctaLabel" defaultValue={banner?.ctaLabel} required />
        <FormField label="لینک دکمه (اختیاری)" name="ctaHref" defaultValue={banner?.ctaHref ?? ""} placeholder="/category/women" />
      </div>
      <FormField label="ترتیب نمایش" name="displayOrder" type="number" defaultValue={String(banner?.displayOrder ?? 0)} />
      <label className="flex items-center gap-2 text-[0.85rem] text-ink">
        <input type="checkbox" name="isActive" defaultChecked={banner?.isActive ?? true} className="h-4 w-4" />
        فعال
      </label>
      <SubmitButton pendingLabel="در حال ذخیره...">{banner ? "ذخیره بنر" : "افزودن بنر"}</SubmitButton>
    </form>
  );
}

export function PromoBannerManager({ banners }: { banners: PromoBanner[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {banners.map((banner) =>
          editingId === banner.id ? (
            <li key={banner.id}>
              <PromoBannerForm banner={banner} onDone={() => setEditingId(null)} />
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="mt-2 text-[0.8rem] text-text-secondary underline underline-offset-2"
              >
                انصراف
              </button>
            </li>
          ) : (
            <li
              key={banner.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line bg-white px-4 py-3 text-[0.85rem]"
            >
              <div className="flex flex-col gap-0.5">
                <span>{banner.title}</span>
                <span className="text-text-secondary">
                  {banner.tone === "pink" ? "صورتی" : "آبی"} · ترتیب: {banner.displayOrder} ·{" "}
                  {banner.isActive ? "فعال" : "غیرفعال"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setEditingId(banner.id)} className="underline underline-offset-2">
                  ویرایش
                </button>
                <ConfirmButton
                  action={() => deletePromoBannerAction(banner.id)}
                  confirmMessage="این بنر حذف شود؟"
                  label="حذف"
                />
              </div>
            </li>
          ),
        )}
      </ul>

      {isAdding ? (
        <PromoBannerForm onDone={() => setIsAdding(false)} />
      ) : (
        <button type="button" onClick={() => setIsAdding(true)} className="w-fit text-[0.85rem] underline underline-offset-2">
          + افزودن بنر جدید
        </button>
      )}
    </div>
  );
}
