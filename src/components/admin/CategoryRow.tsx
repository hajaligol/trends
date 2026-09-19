"use client";

import Image from "next/image";
import { useState } from "react";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { deleteCategoryAction } from "@/domains/categories/actions";
import type { AdminCategoryRow as AdminCategoryRowType, CategoryOption } from "@/domains/categories/queries";

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
      <tr className="border-b border-line last:border-0">
        <td colSpan={6} className="px-4 py-4">
          <CategoryForm category={category} parentOptions={parentOptions} onDone={() => setIsEditing(false)} />
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="mt-2 text-[0.8rem] text-text-secondary underline underline-offset-2"
          >
            انصراف
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-2.5">
        {/* Indented by tree depth so the table reads as an outline. */}
        <div className="flex items-center gap-2.5" style={{ marginInlineStart: `${(category.depth - 1) * 22}px` }}>
          {category.imageUrl ? (
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-card-image">
              <Image src={category.imageUrl} alt="" fill sizes="36px" className="object-cover" />
            </div>
          ) : (
            <div className="h-9 w-9 shrink-0 rounded-full border border-dashed border-line bg-header" aria-hidden="true" />
          )}
          <span className={category.depth === 1 ? "font-bold" : category.depth === 2 ? "font-semibold" : undefined}>
            {category.name}
          </span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-text-secondary" dir="ltr">
        {category.slug}
      </td>
      <td className="px-4 py-2.5 text-text-secondary">{category.parentName ?? "—"}</td>
      <td
        className="px-4 py-2.5"
        title={`${category.productCount} محصول مستقیماً در همین دسته`}
      >
        {category.subtreeProductCount}
      </td>
      <td className="px-4 py-2.5">
        <span
          className={`rounded-full px-3 py-1 text-[0.75rem] ${
            category.isActive ? "bg-sage text-ink" : "bg-header text-text-secondary"
          }`}
        >
          {category.isActive ? "فعال" : "غیرفعال"}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setIsEditing(true)} className="text-[0.8rem] underline underline-offset-2">
            ویرایش
          </button>
          <ConfirmButton
            action={() => deleteCategoryAction(category.id)}
            confirmMessage={`دسته «${category.name}» حذف شود؟`}
            label="حذف"
          />
        </div>
      </td>
    </tr>
  );
}
