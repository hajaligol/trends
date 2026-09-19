"use client";

import { useActionState } from "react";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { createCategoryAction, updateCategoryAction } from "@/domains/categories/actions";
import type { AdminCategoryRow, CategoryOption } from "@/domains/categories/queries";
import { collectDescendantIdsFromFlat, MAX_CATEGORY_DEPTH } from "@/domains/categories/tree";
import type { ActionResult } from "@/domains/auth/roles";

const initialState: ActionResult = { ok: true };

export function CategoryForm({
  category,
  parentOptions,
  onDone,
}: {
  category?: AdminCategoryRow;
  parentOptions: CategoryOption[];
  onDone?: () => void;
}) {
  const action = category ? updateCategoryAction : createCategoryAction;
  const [state, formAction] = useActionState(action, initialState);

  // Offer only parents that keep the tree valid: not the category itself
  // or anything beneath it (that would be a cycle), and nothing already at
  // the deepest level (it couldn't have children). The server re-checks
  // all of this (`validateCategoryParent`) — this is just to not offer
  // choices that are guaranteed to be rejected.
  const unavailable = category ? collectDescendantIdsFromFlat(parentOptions, category.id) : new Set<string>();
  const selectableParents = parentOptions.filter(
    (option) => !unavailable.has(option.id) && option.depth < MAX_CATEGORY_DEPTH,
  );

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onDone?.();
      }}
      className="flex flex-col gap-4"
    >
      {category && <input type="hidden" name="id" value={category.id} />}

      {!state.ok && (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-red-50 px-4 py-2.5 text-[0.85rem] text-red-700">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="نام دسته" name="name" defaultValue={category?.name} required />
        <FormField label="نامک (slug)" name="slug" defaultValue={category?.slug} required placeholder="مثال: women-shoes" />
      </div>

      <ImagePicker name="imageUrl" folder="categories" label="تصویر دسته (اختیاری)" defaultValue={category?.imageUrl} />

      <FormField label="توضیحات (اختیاری)" name="description" defaultValue={category?.description ?? ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.85rem] text-ink">دسته والد (اختیاری)</span>
          <select
            name="parentId"
            defaultValue={category?.parentId ?? ""}
            className="w-full rounded-[var(--radius-md)] border border-line bg-white px-4 py-3 text-[0.92rem] text-ink outline-none focus:outline-2 focus:outline-ink"
          >
            <option value="">— بدون والد —</option>
            {selectableParents.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <FormField label="ترتیب نمایش" name="displayOrder" type="number" defaultValue={String(category?.displayOrder ?? 0)} />
      </div>

      <label className="flex items-center gap-2 text-[0.88rem] text-ink">
        <input type="checkbox" name="isActive" defaultChecked={category?.isActive ?? true} className="h-4 w-4" />
        فعال (در فروشگاه نمایش داده شود)
      </label>

      <SubmitButton pendingLabel="در حال ذخیره...">{category ? "ذخیره تغییرات" : "افزودن دسته"}</SubmitButton>
    </form>
  );
}
