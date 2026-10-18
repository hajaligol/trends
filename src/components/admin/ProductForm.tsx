"use client";

import Link from "next/link";
import { updateProductAction } from "@/domains/catalog/admin-actions";
import type { AdminProductDetail } from "@/domains/catalog/admin-queries";
import type { ActionResult } from "@/domains/auth/roles";
import type { CategoryPickerNode } from "@/domains/categories/queries";
import type { BrandOption } from "@/domains/brands/queries";
import { CategoryCascadeSelect } from "@/components/admin/CategoryCascadeSelect";
import { ProductCreateWizard } from "@/components/admin/product-wizard/ProductCreateWizard";
import { TitleAndSlug } from "@/components/admin/ProductTitleAndSlug";
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

const updateInitialState: ActionResult = { ok: true };

export function ProductForm({
  product,
  categoryNodes,
  brandOptions,
}: {
  product?: AdminProductDetail;
  categoryNodes: CategoryPickerNode[];
  brandOptions: BrandOption[];
}) {
  if (product) {
    return <ProductEditForm product={product} categoryNodes={categoryNodes} brandOptions={brandOptions} />;
  }
  return <ProductCreateWizard categoryNodes={categoryNodes} brandOptions={brandOptions} />;
}

function ProductEditForm({
  product,
  categoryNodes,
  brandOptions,
}: {
  product: AdminProductDetail;
  categoryNodes: CategoryPickerNode[];
  brandOptions: BrandOption[];
}) {
  const [state, formAction] = useAdminAction(updateProductAction, updateInitialState, {
    successMessage: "تغییرات محصول ذخیره شد",
  });

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={product.id} />
      <FormAlert state={state} />
      <ProductFields categoryNodes={categoryNodes} brandOptions={brandOptions} product={product} />
      <FormActionBar>
        <AdminSubmitButton>ذخیره تغییرات</AdminSubmitButton>
      </FormActionBar>
    </form>
  );
}

function ProductFields({
  categoryNodes,
  brandOptions,
  product,
}: {
  categoryNodes: CategoryPickerNode[];
  brandOptions: BrandOption[];
  product?: AdminProductDetail;
}) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6">
        <Card title="اطلاعات اصلی" description="عنوان و توضیحاتی که مشتری در صفحه محصول می‌بیند.">
          <div className="flex flex-col gap-4">
            <TitleAndSlug product={product} />
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
            <CategoryCascadeSelect nodes={categoryNodes} defaultCategoryId={product?.categoryId} />
            <SelectField
              label="برند"
              name="brandId"
              defaultValue={product?.brandId ?? ""}
              optional
              hint={
                brandOptions.length === 0
                  ? "هنوز برندی ثبت نشده است."
                  : "فقط از میان برندهای ثبت‌شده انتخاب می‌شود."
              }
            >
              <option value="">بدون برند</option>
              {brandOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                  {option.isActive ? "" : " (غیرفعال)"}
                </option>
              ))}
            </SelectField>
            <Link href="/admin/brands" className="-mt-2 w-fit text-[0.78rem] text-brand hover:underline">
              مدیریت برندها
            </Link>
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
