"use client";

import Image from "next/image";
import { useState } from "react";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { createPromoBannerAction, deletePromoBannerAction, updatePromoBannerAction } from "@/domains/content/actions";
import type { PromoBanner } from "@/lib/db/schema";
import type { ActionResult } from "@/domains/auth/roles";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { adminButton, EmptyState, StatusBadge } from "@/components/admin/ui/layout";
import { ImageIcon, PencilIcon, PlusIcon } from "@/components/admin/ui/icons";
import { AdminSubmitButton, FieldGrid, FormAlert, SelectField, SwitchField, TextField, useAdminAction } from "@/components/admin/ui/form";

const initialState: ActionResult = { ok: true };

function PromoBannerForm({ banner, onDone, onCancel }: { banner?: PromoBanner; onDone?: () => void; onCancel?: () => void }) {
  const action = banner ? updatePromoBannerAction : createPromoBannerAction;
  const [state, formAction] = useAdminAction(action, initialState, {
    successMessage: banner ? "بنر ذخیره شد" : "بنر اضافه شد",
    onSuccess: () => onDone?.(),
  });

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-line bg-bg p-4 sm:p-5">
      {banner && <input type="hidden" name="id" value={banner.id} />}
      <FormAlert state={state} />
      <FieldGrid>
        <TextField label="عنوان" name="title" defaultValue={banner?.title} required />
        <SelectField label="رنگ پس‌زمینه" name="tone" defaultValue={banner?.tone ?? "pink"}>
          <option value="pink">صورتی</option>
          <option value="blue">آبی</option>
        </SelectField>
      </FieldGrid>
      <ImagePicker name="imageUrl" folder="banners" label="تصویر بنر" shape="wide" defaultValue={banner?.imageUrl} required />
      <TextField label="توضیحات" name="description" defaultValue={banner?.description} required />
      <FieldGrid>
        <TextField label="متن دکمه" name="ctaLabel" defaultValue={banner?.ctaLabel} required placeholder="مشاهده کالکشن" />
        <TextField label="لینک دکمه" name="ctaHref" defaultValue={banner?.ctaHref ?? ""} optional ltr placeholder="/category/women" />
      </FieldGrid>
      <TextField label="ترتیب نمایش" name="displayOrder" type="number" defaultValue={String(banner?.displayOrder ?? 0)} hint="عدد کوچک‌تر، زودتر." />
      <SwitchField name="isActive" label="فعال" description="بنر غیرفعال در صفحه اصلی نمایش داده نمی‌شود." defaultChecked={banner?.isActive ?? true} />
      <div className="flex flex-wrap items-center gap-2.5">
        <AdminSubmitButton>{banner ? "ذخیره بنر" : "افزودن بنر"}</AdminSubmitButton>
        {onCancel && (
          <button type="button" onClick={onCancel} className={adminButton("ghost", "md")}>
            انصراف
          </button>
        )}
      </div>
    </form>
  );
}

export function PromoBannerManager({ banners }: { banners: PromoBanner[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {banners.length === 0 && !isAdding && (
        <EmptyState icon={<ImageIcon width={26} height={26} />} title="هنوز بنری ندارید" description="بنرها در میانه صفحه اصلی برای معرفی کالکشن‌ها و تخفیف‌ها نمایش داده می‌شوند." />
      )}

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {banners.map((banner) =>
          editingId === banner.id ? (
            <li key={banner.id}>
              <PromoBannerForm banner={banner} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
            </li>
          ) : (
            <li key={banner.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-md)] border border-line bg-white p-3">
              <div className="flex min-w-0 items-center gap-4">
                {banner.imageUrl ? (
                  <div className="relative aspect-[16/9] w-32 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-card-image">
                    <Image src={banner.imageUrl} alt="" fill sizes="128px" className="object-cover" />
                  </div>
                ) : (
                  <div className="grid aspect-[16/9] w-32 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-dashed border-ink/20 bg-header-bg text-[0.7rem] text-text-secondary">
                    بدون تصویر
                  </div>
                )}
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="truncate text-[0.9rem] font-medium text-ink">{banner.title}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={banner.isActive ? "success" : "neutral"}>{banner.isActive ? "فعال" : "غیرفعال"}</StatusBadge>
                    <span className="inline-flex items-center gap-1.5 text-[0.76rem] text-text-secondary">
                      <span aria-hidden="true" className={`h-3 w-3 rounded-full ${banner.tone === "pink" ? "bg-pink" : "bg-blue"}`} />
                      {banner.tone === "pink" ? "صورتی" : "آبی"} · ترتیب {toPersianDigits(banner.displayOrder)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditingId(banner.id)}
                  aria-label={`ویرایش بنر «${banner.title}»`}
                  title="ویرایش"
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]"
                >
                  <PencilIcon width={17} height={17} />
                </button>
                <ConfirmButton
                  trigger="icon"
                  action={() => deletePromoBannerAction(banner.id)}
                  title="حذف بنر"
                  confirmMessage="این بنر از صفحه اصلی حذف شود؟"
                  label={`حذف بنر «${banner.title}»`}
                  successMessage="بنر حذف شد"
                />
              </div>
            </li>
          ),
        )}
      </ul>

      {isAdding ? (
        <PromoBannerForm onDone={() => setIsAdding(false)} onCancel={() => setIsAdding(false)} />
      ) : (
        <button type="button" onClick={() => setIsAdding(true)} className={adminButton("secondary", "md", "w-fit")}>
          <PlusIcon width={18} height={18} />
          بنر جدید
        </button>
      )}
    </div>
  );
}
