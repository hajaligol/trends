"use client";

import Image from "next/image";
import { useState } from "react";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { createHeroSlideAction, deleteHeroSlideAction, updateHeroSlideAction } from "@/domains/content/actions";
import type { HeroSlide } from "@/lib/db/schema";
import type { ActionResult } from "@/domains/auth/roles";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { adminButton, EmptyState, StatusBadge } from "@/components/admin/ui/layout";
import { ImageIcon, PencilIcon, PlusIcon } from "@/components/admin/ui/icons";
import { AdminSubmitButton, FieldGrid, FormAlert, SwitchField, TextField, useAdminAction } from "@/components/admin/ui/form";

const initialState: ActionResult = { ok: true };

function HeroSlideForm({ slide, onDone, onCancel }: { slide?: HeroSlide; onDone?: () => void; onCancel?: () => void }) {
  const action = slide ? updateHeroSlideAction : createHeroSlideAction;
  const [state, formAction] = useAdminAction(action, initialState, {
    successMessage: slide ? "اسلاید ذخیره شد" : "اسلاید اضافه شد",
    onSuccess: () => onDone?.(),
  });

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-line bg-bg p-4 sm:p-5">
      {slide && <input type="hidden" name="id" value={slide.id} />}
      <FormAlert state={state} />
      <ImagePicker
        name="imageUrl"
        folder="hero"
        label="تصویر اسلاید"
        shape="wide"
        defaultValue={slide?.imageUrl}
        required
        hint="تصویر افقی (مثلاً ۱۶:۹) با کیفیت خوب پیشنهاد می‌شود."
      />
      <TextField label="متن جایگزین (alt)" name="alt" defaultValue={slide?.alt} required hint="توضیح کوتاه تصویر برای نابینایان و موتورهای جستجو." />
      <FieldGrid>
        <TextField label="لینک دکمه" name="ctaHref" defaultValue={slide?.ctaHref ?? ""} optional ltr placeholder="/category/women" hint="با کلیک روی اسلاید به این آدرس می‌روند." />
        <TextField label="ترتیب نمایش" name="displayOrder" type="number" defaultValue={String(slide?.displayOrder ?? 0)} hint="عدد کوچک‌تر، زودتر." />
      </FieldGrid>
      <SwitchField name="isActive" label="فعال" description="اسلاید غیرفعال در صفحه اصلی نمایش داده نمی‌شود." defaultChecked={slide?.isActive ?? true} />
      <div className="flex flex-wrap items-center gap-2.5">
        <AdminSubmitButton>{slide ? "ذخیره اسلاید" : "افزودن اسلاید"}</AdminSubmitButton>
        {onCancel && (
          <button type="button" onClick={onCancel} className={adminButton("ghost", "md")}>
            انصراف
          </button>
        )}
      </div>
    </form>
  );
}

export function HeroSlideManager({ slides }: { slides: HeroSlide[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {slides.length === 0 && !isAdding && (
        <EmptyState icon={<ImageIcon width={26} height={26} />} title="هنوز اسلایدی ندارید" description="بدون اسلاید، بخش بالای صفحه اصلی خالی می‌ماند. اولین اسلاید را اضافه کنید." />
      )}

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {slides.map((slide) =>
          editingId === slide.id ? (
            <li key={slide.id}>
              <HeroSlideForm slide={slide} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
            </li>
          ) : (
            <li key={slide.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-md)] border border-line bg-white p-3">
              <div className="flex min-w-0 items-center gap-4">
                {slide.imageUrl ? (
                  <div className="relative aspect-[16/9] w-32 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-card-image">
                    <Image src={slide.imageUrl} alt="" fill sizes="128px" className="object-cover" />
                  </div>
                ) : (
                  <div className="grid aspect-[16/9] w-32 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-dashed border-ink/20 bg-header-bg text-[0.7rem] text-text-secondary">
                    بدون تصویر
                  </div>
                )}
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="truncate text-[0.9rem] font-medium text-ink">{slide.alt}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={slide.isActive ? "success" : "neutral"}>{slide.isActive ? "فعال" : "غیرفعال"}</StatusBadge>
                    <span className="text-[0.76rem] text-text-secondary">ترتیب {toPersianDigits(slide.displayOrder)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditingId(slide.id)}
                  aria-label={`ویرایش اسلاید «${slide.alt}»`}
                  title="ویرایش"
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]"
                >
                  <PencilIcon width={17} height={17} />
                </button>
                <ConfirmButton
                  trigger="icon"
                  action={() => deleteHeroSlideAction(slide.id)}
                  title="حذف اسلاید"
                  confirmMessage="این اسلاید از صفحه اصلی حذف شود؟"
                  label={`حذف اسلاید «${slide.alt}»`}
                  successMessage="اسلاید حذف شد"
                />
              </div>
            </li>
          ),
        )}
      </ul>

      {isAdding ? (
        <HeroSlideForm onDone={() => setIsAdding(false)} onCancel={() => setIsAdding(false)} />
      ) : (
        <button type="button" onClick={() => setIsAdding(true)} className={adminButton("secondary", "md", "w-fit")}>
          <PlusIcon width={18} height={18} />
          اسلاید جدید
        </button>
      )}
    </div>
  );
}
