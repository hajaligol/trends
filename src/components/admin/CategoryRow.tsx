"use client";

import Image from "next/image";
import { useState } from "react";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { deleteCategoryAction } from "@/domains/categories/actions";
import type { AdminCategoryRow as AdminCategoryRowType, CategoryOption } from "@/domains/categories/queries";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { StatusBadge, TD, TD_MUTED, TR } from "@/components/admin/ui/layout";
import { PencilIcon } from "@/components/admin/ui/icons";

const DEPTH_LABELS: Record<number, string> = { 1: "مخاطب", 2: "گروه", 3: "نوع" };

export function CategoryRow({
  category,
  parentOptions,
}: {
  category: AdminCategoryRowType;
  parentOptions: CategoryOption[];
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <tr className="border-b border-line bg-bg/60 last:border-0">
        <td colSpan={5} className="p-4 sm:p-5">
          <p className="m-0 mb-4 text-[0.9rem] font-bold text-ink">ویرایش «{category.name}»</p>
          <CategoryForm category={category} parentOptions={parentOptions} onDone={() => setIsEditing(false)} onCancel={() => setIsEditing(false)} />
        </td>
      </tr>
    );
  }

  return (
    <tr className={TR}>
      <td className={TD}>
        {/* Indented by tree depth so the table reads as an outline. */}
        <div className="flex items-center gap-3" style={{ marginInlineStart: `${(category.depth - 1) * 24}px` }}>
          {category.imageUrl ? (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-card-image">
              <Image src={category.imageUrl} alt="" fill sizes="40px" className="object-cover" />
            </div>
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-full border border-dashed border-ink/20 bg-header-bg" aria-hidden="true" />
          )}
          <div className="flex min-w-0 flex-col">
            <span className={category.depth === 1 ? "font-bold" : category.depth === 2 ? "font-semibold" : "font-medium"}>{category.name}</span>
            <span className="text-[0.74rem] text-text-secondary">
              {DEPTH_LABELS[category.depth] ?? ""}
              {category.parentName ? ` · زیرمجموعه ${category.parentName}` : ""}
            </span>
          </div>
        </div>
      </td>
      <td className={TD_MUTED} dir="ltr">
        <span className="block text-end text-[0.8rem]">{category.slug}</span>
      </td>
      <td className={TD} title={`${toPersianDigits(category.productCount)} محصول مستقیماً در همین دسته`}>
        {toPersianDigits(category.subtreeProductCount)}
      </td>
      <td className={TD}>
        <StatusBadge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "فعال" : "غیرفعال"}</StatusBadge>
      </td>
      <td className={TD}>
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={`ویرایش ${category.name}`}
            title="ویرایش"
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]"
          >
            <PencilIcon width={17} height={17} />
          </button>
          <ConfirmButton
            trigger="icon"
            action={() => deleteCategoryAction(category.id)}
            title="حذف دسته‌بندی"
            confirmMessage={`دسته «${category.name}» حذف شود؟ دسته‌ای که زیرمجموعه یا محصول دارد قابل حذف نیست.`}
            label={`حذف ${category.name}`}
            successMessage="دسته‌بندی حذف شد"
          />
        </div>
      </td>
    </tr>
  );
}
