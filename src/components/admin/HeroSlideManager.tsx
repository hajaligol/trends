"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { createHeroSlideAction, deleteHeroSlideAction, updateHeroSlideAction } from "@/domains/content/actions";
import type { HeroSlide } from "@/lib/db/schema";
import type { ActionResult } from "@/domains/auth/roles";

const initialState: ActionResult = { ok: true };

function HeroSlideForm({ slide, onDone }: { slide?: HeroSlide; onDone?: () => void }) {
  const action = slide ? updateHeroSlideAction : createHeroSlideAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onDone?.();
      }}
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-line bg-header p-4"
    >
      {slide && <input type="hidden" name="id" value={slide.id} />}
      {!state.ok && (
        <p role="alert" className="text-[0.8rem] text-red-700">
          {state.error}
        </p>
      )}
      <ImagePicker name="imageUrl" folder="hero" label="تصویر اسلاید" defaultValue={slide?.imageUrl} required />
      <FormField label="متن جایگزین (alt)" name="alt" defaultValue={slide?.alt} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="لینک دکمه (اختیاری)" name="ctaHref" defaultValue={slide?.ctaHref ?? ""} placeholder="/category/women" />
        <FormField label="ترتیب نمایش" name="displayOrder" type="number" defaultValue={String(slide?.displayOrder ?? 0)} />
      </div>
      <label className="flex items-center gap-2 text-[0.85rem] text-ink">
        <input type="checkbox" name="isActive" defaultChecked={slide?.isActive ?? true} className="h-4 w-4" />
        فعال
      </label>
      <SubmitButton pendingLabel="در حال ذخیره...">{slide ? "ذخیره اسلاید" : "افزودن اسلاید"}</SubmitButton>
    </form>
  );
}

export function HeroSlideManager({ slides }: { slides: HeroSlide[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {slides.map((slide) =>
          editingId === slide.id ? (
            <li key={slide.id}>
              <HeroSlideForm slide={slide} onDone={() => setEditingId(null)} />
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
              key={slide.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line bg-white px-4 py-3 text-[0.85rem]"
            >
              <div className="flex items-center gap-3">
                {slide.imageUrl ? (
                  <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-card-image">
                    <Image src={slide.imageUrl} alt="" fill sizes="80px" className="object-cover" />
                  </div>
                ) : (
                  <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-line bg-header text-[0.65rem] text-text-secondary">
                    بدون تصویر
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  <span>{slide.alt}</span>
                  <span className="text-text-secondary">
                    ترتیب: {slide.displayOrder} · {slide.isActive ? "فعال" : "غیرفعال"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setEditingId(slide.id)} className="underline underline-offset-2">
                  ویرایش
                </button>
                <ConfirmButton
                  action={() => deleteHeroSlideAction(slide.id)}
                  confirmMessage="این اسلاید حذف شود؟"
                  label="حذف"
                />
              </div>
            </li>
          ),
        )}
      </ul>

      {isAdding ? (
        <HeroSlideForm onDone={() => setIsAdding(false)} />
      ) : (
        <button type="button" onClick={() => setIsAdding(true)} className="w-fit text-[0.85rem] underline underline-offset-2">
          + افزودن اسلاید جدید
        </button>
      )}
    </div>
  );
}
