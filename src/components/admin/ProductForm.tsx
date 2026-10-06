"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProductAction, updateProductAction } from "@/domains/catalog/admin-actions";
import type { AdminProductDetail } from "@/domains/catalog/admin-queries";
import type { ActionResult } from "@/domains/auth/roles";
import type { CategoryPickerNode } from "@/domains/categories/queries";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { slugifyTitle } from "@/domains/catalog/slug";
import { CategoryCascadeSelect } from "@/components/admin/CategoryCascadeSelect";
import { VariantMatrixBuilder } from "@/components/admin/VariantMatrixBuilder";
import { Card } from "@/components/admin/ui/layout";
import {
  AdminSubmitButton,
  FieldGrid,
  FormActionBar,
  FormAlert,
  SwitchField,
  TextareaField,
  TextField,
  useAdminAction,
} from "@/components/admin/ui/form";

const createInitialState: ActionResult<{ id: string }> = { ok: true, data: { id: "" } };
const updateInitialState: ActionResult = { ok: true };

export function ProductForm({
  product,
  categoryNodes,
}: {
  product?: AdminProductDetail;
  categoryNodes: CategoryPickerNode[];
}) {
  if (product) {
    return <ProductEditForm product={product} categoryNodes={categoryNodes} />;
  }
  return <ProductCreateForm categoryNodes={categoryNodes} />;
}

function ProductCreateForm({ categoryNodes }: { categoryNodes: CategoryPickerNode[] }) {
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
      <ProductFields categoryNodes={categoryNodes} />
      <Card
        title="انواع محصول (سایز و رنگ)"
        description="چند سایز و چند رنگ را یکجا انتخاب کنید؛ هر ترکیب یک نوع جداگانه با کد کالای (SKU) خودکار می‌شود. این بخش اختیاری است و بعداً هم می‌توانید انواع را اضافه کنید."
      >
        <VariantMatrixBuilder />
      </Card>
      <FormActionBar hint="کد کالا و آدرس صفحه محصول بعد از ساخت به‌صورت خودکار ایجاد می‌شوند.">
        <AdminSubmitButton pendingLabel="در حال ساخت...">ساخت محصول</AdminSubmitButton>
      </FormActionBar>
    </form>
  );
}

function ProductEditForm({ product, categoryNodes }: { product: AdminProductDetail; categoryNodes: CategoryPickerNode[] }) {
  const [state, formAction] = useAdminAction(updateProductAction, updateInitialState, {
    successMessage: "تغییرات محصول ذخیره شد",
  });

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={product.id} />
      <FormAlert state={state} />
      <ProductFields categoryNodes={categoryNodes} product={product} />
      <FormActionBar>
        <AdminSubmitButton>ذخیره تغییرات</AdminSubmitButton>
      </FormActionBar>
    </form>
  );
}

function ProductFields({ categoryNodes, product }: { categoryNodes: CategoryPickerNode[]; product?: AdminProductDetail }) {
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

/**
 * Title + URL slug + (for existing products) the read-only product code.
 * On create the slug is only previewed — the server generates the real one
 * from the title. On edit it is shown as an editable field that is NOT
 * re-derived from the title, so renaming a product never breaks its URL.
 */
function TitleAndSlug({ product }: { product?: AdminProductDetail }) {
  const [title, setTitle] = useState(product?.title ?? "");
  const preview = slugifyTitle(title);

  return (
    <>
      <FieldGrid>
        <TextField
          label="عنوان محصول"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          placeholder="مثال: پیراهن کلاسیک مردانه"
        />
        {product ? (
          <TextField
            label="نامک (بخشی از آدرس صفحه)"
            name="slug"
            defaultValue={product.slug}
            ltr
            hint="با تغییر نامک، آدرس صفحه محصول هم عوض می‌شود. فقط حروف کوچک انگلیسی، عدد و خط تیره."
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.84rem] font-medium text-ink">نامک (آدرس صفحه)</span>
            <output
              dir="ltr"
              aria-live="polite"
              className="flex min-h-[46px] items-center rounded-[var(--radius-md)] border border-dashed border-ink/20 bg-bg px-4 py-2.5 text-end text-[0.88rem] text-text-secondary"
            >
              {preview || "از روی عنوان ساخته می‌شود"}
            </output>
            <p className="m-0 text-[0.76rem] leading-5 text-text-secondary">خودکار از عنوان ساخته می‌شود؛ اگر تکراری باشد شماره به انتهایش اضافه می‌شود.</p>
          </div>
        )}
      </FieldGrid>
      {product ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-md)] border border-line bg-bg px-4 py-3 text-[0.84rem]">
          <span className="text-text-secondary">کد کالا</span>
          <span className="font-bold text-ink">{toPersianDigits(product.productCode)}</span>
          <span className="text-[0.76rem] text-text-secondary">(خودکار؛ قابل ویرایش نیست — در جستجوی مدیریت و فروشگاه استفاده می‌شود)</span>
        </div>
      ) : null}
    </>
  );
}
