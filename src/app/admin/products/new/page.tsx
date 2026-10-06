import { listCategoryPickerNodes } from "@/domains/categories/queries";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader } from "@/components/admin/ui/layout";

export const metadata = { title: "محصول جدید", robots: { index: false, follow: false } };

export default async function NewProductPage() {
  const categoryNodes = await listCategoryPickerNodes();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="محصول جدید"
        backHref="/admin/products"
        backLabel="بازگشت به محصولات"
        description="اطلاعات اصلی را وارد کنید و در صورت تمایل چند سایز و رنگ را یکجا انتخاب کنید. تصاویر محصول را پس از ساخت در صفحه ویرایش اضافه می‌کنید."
      />
      <ProductForm categoryNodes={categoryNodes} />
    </div>
  );
}
