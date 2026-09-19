import { listLeafCategoryOptions } from "@/domains/categories/queries";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "محصول جدید", robots: { index: false, follow: false } };

export default async function NewProductPage() {
  const categoryOptions = await listLeafCategoryOptions();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-[1.15rem] font-bold text-ink">محصول جدید</h1>
      <p className="text-[0.85rem] text-text-secondary">
        پس از ایجاد محصول، می‌توانید انواع (سایز/رنگ) و تصاویر آن را در صفحه ویرایش اضافه کنید.
      </p>
      <ProductForm categoryOptions={categoryOptions} />
    </div>
  );
}
