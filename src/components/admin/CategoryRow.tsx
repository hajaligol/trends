"use client";

import { useState } from "react";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { deleteCategoryAction } from "@/domains/categories/actions";
import type { AdminCategoryRow as AdminCategoryRowType } from "@/domains/categories/queries";

export function CategoryRow({
  category,
  parentOptions,
}: {
  category: AdminCategoryRowType;
  parentOptions: { id: string; name: string }[];
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
      <td className="px-4 py-2.5">{category.name}</td>
      <td className="px-4 py-2.5 text-text-secondary" dir="ltr">
        {category.slug}
      </td>
      <td className="px-4 py-2.5 text-text-secondary">{category.parentName ?? "—"}</td>
      <td className="px-4 py-2.5">{category.productCount}</td>
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
