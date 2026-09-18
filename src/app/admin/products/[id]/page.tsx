import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductForAdmin } from "@/domains/catalog/admin-queries";
import { listCategoryOptions } from "@/domains/categories/queries";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductVariantsAndImages } from "@/components/admin/ProductVariantsAndImages";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";

export const metadata = { title: "ویرایش محصول", robots: { index: false, follow: false } };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categoryOptions] = await Promise.all([getProductForAdmin(id), listCategoryOptions()]);
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/products" className="text-[0.8rem] text-text-secondary underline underline-offset-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg> بازگشت به محصولات
          </Link>
          <h1 className="mt-1 text-[1.15rem] font-bold text-ink">{product.title}</h1>
        </div>
        <DeleteProductButton productId={product.id} />
      </div>

      <section className="max-w-2xl">
        <ProductForm product={product} categoryOptions={categoryOptions} />
      </section>

      <ProductVariantsAndImages productId={product.id} variants={product.variants} images={product.images} />
    </div>
  );
}
