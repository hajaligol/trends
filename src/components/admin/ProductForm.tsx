"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createProductAction, updateProductAction } from "@/domains/catalog/admin-actions";
import type { AdminProductDetail } from "@/domains/catalog/admin-queries";
import type { ActionResult } from "@/domains/auth/roles";
import type { CategoryOption } from "@/domains/categories/queries";
import { CATEGORY_PATH_SEPARATOR } from "@/domains/categories/tree";

const createInitialState: ActionResult<{ id: string }> = { ok: true, data: { id: "" } };
const updateInitialState: ActionResult = { ok: true };

export function ProductForm({
  product,
  categoryOptions,
}: {
  product?: AdminProductDetail;
  categoryOptions: CategoryOption[];
}) {
  if (product) {
    return <ProductEditFields product={product} categoryOptions={categoryOptions} />;
  }
  return <ProductCreateFields categoryOptions={categoryOptions} />;
}

function ProductCreateFields({ categoryOptions }: { categoryOptions: CategoryOption[] }) {
  const router = useRouter();
  const [state, formAction] = useActionState(createProductAction, createInitialState);

  // `state.data.id` only becomes truthy after a successful create — an
  // effect (not branching inside the render/submit path) is the correct
  // place to react to that, since `useActionState`'s returned `state` is
  // what actually drives re-renders here.
  useEffect(() => {
    if (state.ok && state.data.id) router.push(`/admin/products/${state.data.id}`);
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ProductFields state={state} categoryOptions={categoryOptions} />
      <SubmitButton pendingLabel="در حال ایجاد...">ایجاد محصول</SubmitButton>
    </form>
  );
}

function ProductEditFields({
  product,
  categoryOptions,
}: {
  product: AdminProductDetail;
  categoryOptions: CategoryOption[];
}) {
  const [state, formAction] = useActionState(updateProductAction, updateInitialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={product.id} />
      <ProductFields state={state} categoryOptions={categoryOptions} product={product} />
      <SubmitButton pendingLabel="در حال ذخیره...">ذخیره تغییرات</SubmitButton>
    </form>
  );
}

/** Groups tree-ordered options by their parent path, keeping order. */
function groupCategoryOptions(options: CategoryOption[]): Array<{ group: string; options: CategoryOption[] }> {
  const groups: Array<{ group: string; options: CategoryOption[] }> = [];
  for (const option of options) {
    const label = option.group ?? "دسته‌ها";
    const last = groups[groups.length - 1];
    if (last && last.group === label) last.options.push(option);
    else groups.push({ group: label, options: [option] });
  }
  return groups;
}

function ProductFields({
  state,
  categoryOptions,
  product,
}: {
  state: { ok: boolean; error?: string };
  categoryOptions: CategoryOption[];
  product?: AdminProductDetail;
}) {
  return (
    <>
      {!state.ok && (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-red-50 px-4 py-2.5 text-[0.85rem] text-red-700">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="عنوان محصول" name="title" defaultValue={product?.title} required />
        <FormField label="نامک (slug)" name="slug" defaultValue={product?.slug} required placeholder="مثال: classic-shirt" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.85rem] text-ink">دسته‌بندی</span>
          <select
            name="categoryId"
            defaultValue={product?.categoryId ?? ""}
            required
            className="w-full rounded-[var(--radius-md)] border border-line bg-white px-4 py-3 text-[0.92rem] text-ink outline-none focus:outline-2 focus:outline-ink"
          >
            <option value="" disabled>
              انتخاب دسته
            </option>
            {groupCategoryOptions(categoryOptions).map(({ group, options }) => (
              // One <optgroup> per parent group ("مردانه › لباس مردانه"), so
              // the ~180 type categories stay scannable.
              <optgroup key={group} label={group}>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name.split(CATEGORY_PATH_SEPARATOR).pop()}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <FormField label="برند (اختیاری)" name="brand" defaultValue={product?.brand ?? ""} />
      </div>

      <FormField label="توضیح کوتاه (اختیاری)" name="shortDescription" defaultValue={product?.shortDescription ?? ""} />

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.85rem] text-ink">توضیح کامل (اختیاری)</span>
        <textarea
          name="longDescription"
          defaultValue={product?.longDescription ?? ""}
          rows={4}
          className="w-full rounded-[var(--radius-md)] border border-line bg-white px-4 py-3 text-[0.92rem] text-ink outline-none focus:outline-2 focus:outline-ink"
        />
      </label>

      <FormField
        label="برچسب‌ها (با کاما جدا کنید، اختیاری)"
        name="tags"
        defaultValue={product?.tags?.join(", ") ?? ""}
        placeholder="مثال: پاییزه, پنبه"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="عنوان سئو (اختیاری)" name="seoTitle" defaultValue={product?.seoTitle ?? ""} />
        <FormField label="توضیح سئو (اختیاری)" name="seoDescription" defaultValue={product?.seoDescription ?? ""} />
      </div>

      <div className="flex flex-wrap gap-5 text-[0.88rem] text-ink">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={product?.isActive ?? true} className="h-4 w-4" />
          فعال
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured ?? false} className="h-4 w-4" />
          محصول ویژه
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isNewArrival" defaultChecked={product?.isNewArrival ?? false} className="h-4 w-4" />
          جدید
        </label>
      </div>
    </>
  );
}
