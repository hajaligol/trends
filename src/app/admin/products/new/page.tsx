import { listCategoryPickerNodes } from "@/domains/categories/queries";
import { listBrandOptions } from "@/domains/brands/queries";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader } from "@/components/admin/ui/layout";

export const metadata = { title: "محصول جدید", robots: { index: false, follow: false } };

export default async function NewProductPage() {
  const [categoryNodes, brandOptions] = await Promise.all([listCategoryPickerNodes(), listBrandOptions()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="محصول جدید"
        backHref="/admin/products"
        backLabel="بازگشت به محصولات"
        description="در هشت مرحله: اطلاعات اصلی، دسته‌بندی و برند، سایز و رنگ، تصاویر، جدول مشخصات، جدول سایز، نمایش و سئو، و در پایان مرور و ساخت."
      />
      <ProductForm categoryNodes={categoryNodes} brandOptions={brandOptions} />
    </div>
  );
}
