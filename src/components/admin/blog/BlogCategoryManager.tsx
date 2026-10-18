"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { adminButton, StatusBadge, TABLE, TD, TD_MUTED, TH, THEAD, TR, TableCard, EmptyRow } from "@/components/admin/ui/layout";
import { AdminSubmitButton, FieldGrid, FormAlert, SwitchField, TextareaField, TextField, useAdminAction } from "@/components/admin/ui/form";
import { PencilIcon } from "@/components/admin/ui/icons";
import { createBlogCategoryAction, deleteBlogCategoryAction, updateBlogCategoryAction } from "@/domains/blog/admin-actions";
import type { AdminBlogCategoryRow } from "@/domains/blog/admin-queries";
import type { ActionResult } from "@/domains/auth/roles";
import { toPersianDigits } from "@/lib/utils/persian-digits";

const initialState: ActionResult = { ok: true };

export function BlogCategoryForm({ category, onDone }: { category?: AdminBlogCategoryRow; onDone?: () => void }) {
  const router = useRouter();
  const [state, formAction] = useAdminAction(category ? updateBlogCategoryAction : createBlogCategoryAction, initialState, {
    successMessage: category ? "دسته ذخیره شد" : "دسته اضافه شد",
    onSuccess: () => {
      onDone?.();
      router.refresh();
    },
  });

  return (
    <form action={formAction} key={category?.id ?? "new"} className="flex flex-col gap-4">
      {category && <input type="hidden" name="id" value={category.id} />}
      <FormAlert state={state} />
      <FieldGrid>
        <TextField label="نام دسته" name="name" defaultValue={category?.name} required maxLength={80} placeholder="مثال: راهنمای سایز" />
        <TextField label="ترتیب نمایش" name="displayOrder" type="number" defaultValue={String(category?.displayOrder ?? 0)} hint="عدد کوچک‌تر، زودتر." />
      </FieldGrid>
      {category && <TextField label="نامک" name="slug" defaultValue={category.slug} hint="آدرس صفحه‌ی دسته؛ با تغییر نام عوض نمی‌شود." />}
      <TextareaField label="توضیحات" name="description" defaultValue={category?.description ?? ""} optional rows={2} maxLength={400} hint="زیر عنوان صفحه‌ی دسته و در متای آن استفاده می‌شود." />
      <SwitchField name="isActive" label="فعال" description="دسته‌ی غیرفعال در سایت نمایش داده نمی‌شود؛ مقاله‌هایش همچنان منتشر می‌مانند." defaultChecked={category?.isActive ?? true} />
      <div className="flex gap-2.5">
        <AdminSubmitButton>{category ? "ذخیره تغییرات" : "افزودن دسته"}</AdminSubmitButton>
        {onDone && (
          <button type="button" onClick={onDone} className={adminButton("ghost", "md")}>
            انصراف
          </button>
        )}
      </div>
    </form>
  );
}

function CategoryRow({ category }: { category: AdminBlogCategoryRow }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <tr className="border-b border-line bg-bg/60 last:border-0">
        <td colSpan={5} className="p-4 sm:p-5">
          <BlogCategoryForm category={category} onDone={() => setEditing(false)} />
        </td>
      </tr>
    );
  }
  return (
    <tr className={TR}>
      <td className={`${TD} font-semibold text-ink`}>{category.name}</td>
      <td className={TD_MUTED} dir="ltr">
        <span className="block text-end text-[0.8rem]">{category.slug}</span>
      </td>
      <td className={TD}>{toPersianDigits(category.postCount)}</td>
      <td className={TD}>
        <StatusBadge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "فعال" : "غیرفعال"}</StatusBadge>
      </td>
      <td className={TD}>
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={() => setEditing(true)} aria-label={`ویرایش ${category.name}`} title="ویرایش" className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]">
            <PencilIcon width={17} height={17} />
          </button>
          <ConfirmButton
            trigger="icon"
            label={`حذف ${category.name}`}
            action={() => deleteBlogCategoryAction(category.id)}
            confirmMessage="دسته حذف می‌شود؛ مقاله‌های آن می‌مانند و فقط بدون دسته خواهند شد."
            successMessage="دسته حذف شد"
          />
        </div>
      </td>
    </tr>
  );
}

export function BlogCategoryTable({ categories }: { categories: AdminBlogCategoryRow[] }) {
  return (
    <TableCard>
      <table className={`${TABLE} min-w-[620px]`}>
        <thead className={THEAD}>
          <tr>
            <th className={TH}>نام</th>
            <th className={TH}>نامک</th>
            <th className={TH}>مقاله‌ها</th>
            <th className={TH}>وضعیت</th>
            <th className={TH}>
              <span className="sr-only">عملیات</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.length === 0 ? <EmptyRow colSpan={5}>هنوز دسته‌ای ثبت نشده است.</EmptyRow> : categories.map((category) => <CategoryRow key={category.id} category={category} />)}
        </tbody>
      </table>
    </TableCard>
  );
}
