"use client";

import { useRouter } from "next/navigation";
import { createProductAction, updateProductAction } from "@/domains/catalog/admin-actions";
import type { AdminProductDetail } from "@/domains/catalog/admin-queries";
import type { ActionResult } from "@/domains/auth/roles";
import type { CategoryOption } from "@/domains/categories/queries";
import { CATEGORY_PATH_SEPARATOR } from "@/domains/categories/tree";
import { Card } from "@/components/admin/ui/layout";
import {
  AdminSubmitButton,
  FieldGrid,
  FormActionBar,
  FormAlert,
  SelectField,
  SwitchField,
  TextareaField,
  TextField,
  useAdminAction,
} from "@/components/admin/ui/form";

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
    return <ProductEditForm product={product} categoryOptions={categoryOptions} />;
  }
  return <ProductCreateForm categoryOptions={categoryOptions} />;
}

function ProductCreateForm({ categoryOptions }: { categoryOptions: CategoryOption[] }) {
  const router = useRouter();
  const [state, formAction] = useAdminAction(createProductAction, createInitialState, {
    successMessage: "محصول ساخته شد؛ حالا سایز، رنگ و تصاویر را اضافه کنید",
    onSuccess: (result) => {
      if (result.ok && result.data.id) router.push(`/admin/products/${result.data.id}`);
    },
  });

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormAlert state={state} />
      <ProductFields categoryOptions={categoryOptions} />
      <FormActionBar hint="بعد از ساخت محصول به صفحه ویرایش می‌روید تا انواع و تصاویر را اضافه کنید.">
        <AdminSubmitButton pendingLabel="در حال ساخت...">ساخت محصول</AdminSubmitButton>
      </FormActionBar>
    </form>
  );
}

function ProductEditForm({ product, categoryOptions }: { product: AdminProductDetail; categoryOptions: CategoryOption[] }) {
  const [state, formAction] = useAdminAction(updateProductAction, updateInitialState, {
    successMessage: "تغییرات محصول ذخیره شد",
  });

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={product.id} />
      <FormAlert state={state} />
      <ProductFields categoryOptions={categoryOptions} product={product} />
      <FormActionBar>
        <AdminSubmitButton>ذخیره تغییرات</AdminSubmitButton>
      </FormActionBar>
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

function ProductFields({ categoryOptions, product }: { categoryOptions: CategoryOption[]; product?: AdminProductDetail }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6">
        <Card title="اطلاعات اصلی" description="عنوان و توضیحاتی که مشتری در صفحه محصول می‌بیند.">
          <div className="flex flex-col gap-4">
            <FieldGrid>
              <TextField label="عنوان محصول" name="title" defaultValue={product?.title} required placeholder="مثال: پیراهن کلاسیک مردانه" />
              <TextField
                label="نامک (بخشی از آدرس صفحه)"
                name="slug"
                defaultValue={product?.slug}
                required
                ltr
                placeholder="classic-shirt"
                hint={
                  product
                    ? "با تغییر نامک، آدرس صفحه محصول هم عوض می‌شود. فقط حروف کوچک انگلیسی، عدد و خط تیره."
                    : "فقط حروف کوچک انگلیسی، عدد و خط تیره؛ مثلاً classic-shirt"
                }
              />
            </FieldGrid>
            <TextField label="توضیح کوتاه" name="shortDescription" defaultValue={product?.shortDescription ?? ""} optional hint="یک جمله برای کارت محصول و نتایج جستجو." />
            <TextareaField label="توضیح کامل" name="longDescription" defaultValue={product?.longDescription ?? ""} optional rows={6} />
          </div>
        </Card>

        <Card title="سئو (نمایش در گوگل)" description="اگر خالی بماند، از عنوان و توضیح کوتاه محصول استفاده می‌شود.">
          <FieldGrid>
            <TextField label="عنوان سئو" name="seoTitle" defaultValue={product?.seoTitle ?? ""} optional />
            <TextField label="توضیح سئو" name="seoDescription" defaultValue={product?.seoDescription ?? ""} optional />
          </FieldGrid>
        </Card>
      </div>

      <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6">
        <Card title="نمایش در فروشگاه">
          <div className="flex flex-col gap-3">
            <SwitchField name="isActive" label="فعال" description="غیرفعال‌ها در فروشگاه دیده نمی‌شوند." defaultChecked={product?.isActive ?? true} />
            <SwitchField name="isFeatured" label="محصول ویژه" description="در بخش «شگفت‌انگیزها» صفحه اصلی." defaultChecked={product?.isFeatured ?? false} />
            <SwitchField name="isNewArrival" label="جدید" description="در بخش «جدیدترین محصولات»." defaultChecked={product?.isNewArrival ?? false} />
          </div>
        </Card>

        <Card title="دسته‌بندی و برچسب">
          <div className="flex flex-col gap-4">
            <SelectField label="دسته‌بندی" name="categoryId" defaultValue={product?.categoryId ?? ""} required>
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
            </SelectField>
            <TextField label="برند" name="brand" defaultValue={product?.brand ?? ""} optional />
            <TextField
              label="برچسب‌ها"
              name="tags"
              defaultValue={product?.tags?.join(", ") ?? ""}
              optional
              placeholder="پاییزه, پنبه"
              hint="با کاما جدا کنید."
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
