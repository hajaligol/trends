"use client";

import Image from "next/image";
import { useState } from "react";
import { BrandActiveToggle } from "@/components/admin/BrandActiveToggle";
import { BrandForm } from "@/components/admin/BrandForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { deleteBrandAction } from "@/domains/brands/actions";
import type { AdminBrandRow } from "@/domains/brands/queries";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { TD, TD_MUTED, TR } from "@/components/admin/ui/layout";
import { PencilIcon, TagIcon } from "@/components/admin/ui/icons";

export function BrandRow({ brand }: { brand: AdminBrandRow }) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <tr className="border-b border-line bg-bg/60 last:border-0">
        <td colSpan={5} className="p-4 sm:p-5">
          <p className="m-0 mb-4 text-[0.9rem] font-bold text-ink">ویرایش «{brand.name}»</p>
          <BrandForm brand={brand} onDone={() => setIsEditing(false)} onCancel={() => setIsEditing(false)} />
        </td>
      </tr>
    );
  }

  return (
    <tr className={TR}>
      <td className={TD}>
        <div className="flex items-center gap-3">
          <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-md)] border border-line bg-white">
            {brand.logoUrl ? (
              <Image src={brand.logoUrl} alt="" fill sizes="44px" className="object-contain p-1" />
            ) : (
              <TagIcon width={18} height={18} className="text-text-secondary/60" />
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="font-semibold text-ink">{brand.name}</span>
            {(brand.nameEn || brand.countryOfOrigin) && (
              <span className="text-[0.74rem] text-text-secondary">
                {brand.nameEn}
                {brand.nameEn && brand.countryOfOrigin ? " · " : ""}
                {brand.countryOfOrigin}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className={TD_MUTED} dir="ltr">
        <span className="block text-end text-[0.8rem]">{brand.slug}</span>
      </td>
      <td className={TD}>{toPersianDigits(brand.productCount)}</td>
      <td className={TD}>
        <BrandActiveToggle brandId={brand.id} isActive={brand.isActive} />
      </td>
      <td className={TD}>
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={`ویرایش ${brand.name}`}
            title="ویرایش"
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]"
          >
            <PencilIcon width={17} height={17} />
          </button>
          <ConfirmButton
            trigger="icon"
            action={() => deleteBrandAction(brand.id)}
            title="حذف برند"
            confirmMessage={
              brand.productCount > 0
                ? `«${brand.name}» به ${toPersianDigits(brand.productCount)} محصول اختصاص داده شده و قابل حذف نیست؛ برای پنهان کردن آن، غیرفعالش کنید.`
                : `برند «${brand.name}» حذف شود؟`
            }
            label={`حذف ${brand.name}`}
            successMessage="برند حذف شد"
          />
        </div>
      </td>
    </tr>
  );
}
