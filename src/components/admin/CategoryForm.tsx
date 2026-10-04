"use client";

import { ImagePicker } from "@/components/admin/ImagePicker";
import { createCategoryAction, updateCategoryAction } from "@/domains/categories/actions";
import type { AdminCategoryRow, CategoryOption } from "@/domains/categories/queries";
import { collectDescendantIdsFromFlat, MAX_CATEGORY_DEPTH } from "@/domains/categories/tree";
import type { ActionResult } from "@/domains/auth/roles";
import { adminButton } from "@/components/admin/ui/layout";
import { AdminSubmitButton, FieldGrid, FormAlert, SelectField, SwitchField, TextField, useAdminAction } from "@/components/admin/ui/form";

const initialState: ActionResult = { ok: true };

export function CategoryForm({
  category,
  parentOptions,
  onDone,
  onCancel,
}: {
  category?: AdminCategoryRow;
  parentOptions: CategoryOption[];
  /** Called only after the server accepted the change. */
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const action = category ? updateCategoryAction : createCategoryAction;
  const [state, formAction] = useAdminAction(action, initialState, {
    successMessage: category ? "دسته‌بندی ذخیره شد" : "دسته‌بندی اضافه شد",
    onSuccess: () => onDone?.(),
  });

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
    <form action={formAction} className="flex flex-col gap-4">
      {category && <input type="hidden" name="id" value={category.id} />}
      <FormAlert state={state} />

      <FieldGrid>
        <TextField label="نام دسته" name="name" defaultValue={category?.name} required />
        <TextField label="نامک (بخشی از آدرس)" name="slug" defaultValue={category?.slug} required ltr placeholder="women-shoes" hint="فقط حروف کوچک انگلیسی، عدد و خط تیره." />
      </FieldGrid>

      <FieldGrid>
        <SelectField label="دسته والد" name="parentId" defaultValue={category?.parentId ?? ""} optional hint="دسته‌های اصلی (مخاطب) والد ندارند.">
          <option value="">بدون والد</option>
          {selectableParents.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </SelectField>
        <TextField label="ترتیب نمایش" name="displayOrder" type="number" defaultValue={String(category?.displayOrder ?? 0)} hint="عدد کوچک‌تر، زودتر." />
      </FieldGrid>

      <TextField label="توضیحات" name="description" defaultValue={category?.description ?? ""} optional />

      <ImagePicker name="imageUrl" folder="categories" label="تصویر دسته (اختیاری)" defaultValue={category?.imageUrl} />

      <SwitchField name="isActive" label="فعال" description="دسته غیرفعال در فروشگاه نمایش داده نمی‌شود." defaultChecked={category?.isActive ?? true} />

      <div className="flex flex-wrap items-center gap-2.5">
        <AdminSubmitButton>{category ? "ذخیره تغییرات" : "افزودن دسته"}</AdminSubmitButton>
        {onCancel && (
          <button type="button" onClick={onCancel} className={adminButton("ghost", "md")}>
            انصراف
          </button>
        )}
      </div>
    </form>
  );
}
