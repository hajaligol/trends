import { notFound } from "next/navigation";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { getProductForAdmin } from "@/domains/catalog/admin-queries";
import { listCategoryPickerNodes } from "@/domains/categories/queries";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductSpecificationsEditor } from "@/components/admin/ProductSpecificationsEditor";
import { ProductVariantsAndImages } from "@/components/admin/ProductVariantsAndImages";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { Card, PageHeader, StatusBadge } from "@/components/admin/ui/layout";
import { ExternalLinkIcon } from "@/components/admin/ui/icons";

export const metadata = { title: "ویرایش محصول", robots: { index: false, follow: false } };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categoryNodes] = await Promise.all([getProductForAdmin(id), listCategoryPickerNodes()]);
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={product.title}
        backHref="/admin/products"
        backLabel="بازگشت به محصولات"
        badge={<StatusBadge tone={product.isActive ? "success" : "neutral"}>{product.isActive ? "فعال" : "غیرفعال"}</StatusBadge>}
        actions={
          <>
            {product.isActive && (
              <a
                href={`/product/${product.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-white px-4 py-2 text-[0.82rem] font-semibold text-ink transition-colors hover:border-ink/40 hover:bg-ink/[0.04]"
              >
                <ExternalLinkIcon width={16} height={16} />
                مشاهده در فروشگاه
              </a>
            )}
            <DeleteProductButton productId={product.id} productTitle={product.title} />
          </>
        }
        description={
          <>
            <span className="font-semibold text-ink">کد کالا: {toPersianDigits(product.productCode)}</span>
            {" · "}
            <a href="#variants" className="text-brand hover:underline">انواع و قیمت</a>
            {" · "}
            <a href="#images" className="text-brand hover:underline">تصاویر</a>
            {" · "}
            <a href="#specs" className="text-brand hover:underline">جدول مشخصات</a>
          </>
        }
      />

      <ProductForm product={product} categoryNodes={categoryNodes} />

      <ProductVariantsAndImages productId={product.id} productCode={product.productCode} variants={product.variants} images={product.images} />

      <Card
        id="specs"
        title="جدول مشخصات محصول"
        description="برند، دسته‌بندی، جنس، سایزها، رنگ‌ها و برچسب‌ها خودکار در جدول نمایش داده می‌شوند. ردیف‌های زیر به انتهای جدول اضافه می‌شوند."
      >
        <ProductSpecificationsEditor productId={product.id} initialRows={product.specifications} />
      </Card>
    </div>
  );
}
