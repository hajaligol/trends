"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { MarkdownEditor } from "@/components/admin/blog/MarkdownEditor";
import { FaqEditor } from "@/components/admin/blog/FaqEditor";
import { Card, adminButton } from "@/components/admin/ui/layout";
import { AdminSubmitButton, FieldGrid, FormActionBar, FormAlert, SelectField, TextareaField, TextField, useAdminAction } from "@/components/admin/ui/form";
import { createBlogPostAction, deleteBlogPostAction, updateBlogPostAction } from "@/domains/blog/admin-actions";
import type { ActionResult } from "@/domains/auth/roles";
import type { BlogCategory, BlogPost } from "@/lib/db/schema";
import { dateToTehranInput } from "@/lib/utils/tehran-time";
import { blogPostHref } from "@/domains/blog/paths";

const initialState: ActionResult<{ id: string }> = { ok: true, data: { id: "" } };

/** Create/edit form for one T-Mag article. Every value is re-validated by the Server Action. */
export function BlogPostForm({ post, categories }: { post?: BlogPost; categories: Pick<BlogCategory, "id" | "name">[] }) {
  const router = useRouter();
  const [state, formAction] = useAdminAction(post ? updateBlogPostAction : createBlogPostAction, initialState, {
    successMessage: post ? "مقاله ذخیره شد" : "مقاله ایجاد شد",
    onSuccess: (result) => {
      if (!post && result.ok && result.data?.id) router.push(`/admin/tmag/${result.data.id}`);
      else router.refresh();
    },
  });

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {post && <input type="hidden" name="id" value={post.id} />}
      <FormAlert state={state} />

      <Card title="محتوا">
        <div className="flex flex-col gap-4">
          <TextField label="عنوان مقاله" name="title" defaultValue={post?.title} required maxLength={160} hint="عنوان اصلی صفحه (H1)؛ ترجیحاً شامل عبارت اصلی جستجو." />
          <TextareaField
            label="خلاصه / مقدمه"
            name="excerpt"
            defaultValue={post?.excerpt}
            required
            rows={3}
            maxLength={320}
            hint="دو سه جمله که پرسش اصلی مقاله را مستقیم پاسخ دهد؛ در کارت‌ها، گوگل و پاسخ‌های هوش مصنوعی استفاده می‌شود."
          />
          <MarkdownEditor defaultValue={post?.content ?? ""} />
        </div>
      </Card>

      <Card title="خلاصه‌ی مقاله و پرسش‌های متداول" description="بخش‌های ساختاریافته‌ای که موتورهای جستجو و دستیارهای هوشمند به‌راحتی از آن‌ها نقل می‌کنند.">
        <div className="flex flex-col gap-5">
          <TextareaField
            label="نکات کلیدی"
            name="keyTakeaways"
            defaultValue={(post?.keyTakeaways ?? []).join("\n")}
            optional
            rows={5}
            hint="هر نکته در یک خط (۳ تا ۶ مورد). بالای مقاله در کادر «خلاصه‌ی مقاله» نمایش داده می‌شود."
          />
          <div className="flex flex-col gap-2">
            <span className="text-[0.84rem] font-medium text-ink">پرسش‌های متداول</span>
            <FaqEditor defaultValue={post?.faq ?? []} />
          </div>
        </div>
      </Card>

      <Card title="تصویر شاخص و دسته‌بندی">
        <div className="flex flex-col gap-4">
          <ImagePicker name="coverImageUrl" folder="blog" label="تصویر شاخص" kind="blogCover" defaultValue={post?.coverImageUrl} hint="در لیست، صفحه‌ی مقاله و اشتراک‌گذاری نمایش داده می‌شود." />
          <TextField label="متن جایگزین تصویر شاخص (alt)" name="coverImageAlt" defaultValue={post?.coverImageAlt ?? ""} optional hint="توصیفی کوتاه از تصویر؛ برای دسترسی‌پذیری و سئوی تصاویر. با انتخاب تصویر الزامی است." />
          <FieldGrid>
            <SelectField label="دسته‌بندی" name="categoryId" defaultValue={post?.categoryId ?? ""} optional>
              <option value="">بدون دسته</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectField>
            <TextField label="برچسب‌ها" name="tags" defaultValue={(post?.tags ?? []).join("، ")} optional hint="با ویرگول جدا کنید (حداکثر ۱۲). برای پیشنهاد «مقالات مفید بیشتر» هم استفاده می‌شود." />
          </FieldGrid>
        </div>
      </Card>

      <Card title="انتشار و سئو">
        <div className="flex flex-col gap-4">
          <FieldGrid columns={3}>
            <SelectField label="وضعیت" name="status" defaultValue={post?.status ?? "draft"} required>
              <option value="draft">پیش‌نویس (نمایش داده نمی‌شود)</option>
              <option value="published">منتشر شده</option>
            </SelectField>
            <TextField
              label="زمان انتشار (به وقت تهران)"
              name="publishedAt"
              type="datetime-local"
              defaultValue={dateToTehranInput(post?.publishedAt ?? null)}
              optional
              hint="خالی = همین الان (هنگام انتشار). تاریخ آینده، مقاله را زمان‌بندی می‌کند."
            />
            <TextField label="نویسنده" name="authorName" defaultValue={post?.authorName ?? "تحریریه ترندز"} required maxLength={80} />
          </FieldGrid>
          <TextField
            label="نامک (آدرس مقاله)"
            name="slug"
            defaultValue={post?.slug ?? ""}
            optional
            hint={post ? "با تغییر عنوان عوض نمی‌شود. تغییر نامک، آدرس قبلی مقاله را از کار می‌اندازد." : "خالی بگذارید تا از عنوان ساخته شود."}
          />
          <TextField label="عنوان سئو (Title)" name="seoTitle" defaultValue={post?.seoTitle ?? ""} optional maxLength={70} hint="تا ۷۰ کاراکتر؛ خالی = عنوان مقاله." />
          <TextareaField label="توضیحات متا (Description)" name="seoDescription" defaultValue={post?.seoDescription ?? ""} optional rows={2} maxLength={170} hint="تا ۱۷۰ کاراکتر؛ خالی = خلاصه‌ی مقاله." />
        </div>
      </Card>

      <FormActionBar hint={post ? "پس از ذخیره، صفحه‌ی مقاله در سایت به‌روز می‌شود." : undefined}>
        {post && (
          <>
            {post.status === "published" && (
              <Link href={blogPostHref(post.slug)} target="_blank" className={adminButton("ghost", "md")}>
                مشاهده در سایت
              </Link>
            )}
            <ConfirmButton
              action={() => deleteBlogPostAction(post.id)}
              label="حذف مقاله"
              confirmMessage="این مقاله و همه‌ی دیدگاه‌هایش برای همیشه حذف می‌شود."
              successMessage="مقاله حذف شد"
              redirectTo="/admin/tmag"
            />
          </>
        )}
        <AdminSubmitButton>{post ? "ذخیره تغییرات" : "ایجاد مقاله"}</AdminSubmitButton>
      </FormActionBar>
    </form>
  );
}
