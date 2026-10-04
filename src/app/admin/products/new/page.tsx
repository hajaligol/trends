import { listLeafCategoryOptions } from "@/domains/categories/queries";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader } from "@/components/admin/ui/layout";

export const metadata = { title: "محصول جدید", robots: { index: false, follow: false } };

export default async function NewProductPage() {
  const categoryOptions = await listLeafCategoryOptions();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="محصول جدید"
        backHref="/admin/products"
        backLabel="بازگشت به محصولات"
        description="ابتدا اطلاعات اصلی را وارد کنید. پس از ساخت محصول، می‌توانید سایز و رنگ‌ها (با قیمت و موجودی) و تصاویر آن را در صفحه ویرایش اضافه کنید."
      />
      <ProductForm categoryOptions={categoryOptions} />
    </div>
  );
}
