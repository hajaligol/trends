import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { listStorefrontBrands } from "@/domains/brands/queries";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata: Metadata = {
  title: "برندها",
  description: "فهرست برندهای ترندز: نام، لوگو، کشور سازنده و معرفی هر برند.",
  alternates: { canonical: "/brands" },
  openGraph: { url: "/brands" },
};

// Brand edits revalidate this page; the timer picks up changes in the
// best-selling order (which only moves as orders come in).
export const revalidate = 300;

/** `/brands` — every active brand with logo, name, country and description. */
export default async function BrandsPage() {
  const brands = await listStorefrontBrands();

  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <Breadcrumbs items={[{ label: "صفحه اصلی", href: "/" }, { label: "برندها" }]} />
        <h1 className="mb-2 mt-0 text-[clamp(1.5rem,3vw,2.1rem)] font-bold">برندها</h1>
        <p className="mb-8 mt-0 text-[0.95rem] text-text-secondary">
          برندهای پرفروش در ابتدای فهرست قرار دارند.
        </p>

        {brands.length === 0 ? (
          <p className="rounded-[14px] bg-benefit-bg px-5 py-10 text-center text-text-secondary">
            هنوز برندی ثبت نشده است.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <li
                key={brand.slug}
                className="flex flex-col gap-4 rounded-[22px] border border-line bg-white p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-card-image">
                    {brand.logoUrl ? (
                      <Image src={brand.logoUrl} alt={`لوگوی ${brand.name}`} fill sizes="76px" className="object-contain p-2" />
                    ) : (
                      <span aria-hidden="true" className="text-[1.8rem] font-bold text-ink/45">
                        {(brand.nameEn ?? brand.name).trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="m-0 text-[1.1rem] font-bold">{brand.name}</h2>
                    {brand.nameEn && (
                      <p dir="ltr" className="m-0 text-start text-[0.85rem] text-text-secondary">
                        {brand.nameEn}
                      </p>
                    )}
                    {brand.countryOfOrigin && (
                      <p className="m-0 mt-1 text-[0.82rem] text-text-secondary">
                        کشور: <span className="font-semibold text-ink">{brand.countryOfOrigin}</span>
                      </p>
                    )}
                  </div>
                </div>

                <p className="m-0 flex-1 text-[0.9rem] leading-7 text-text-secondary">
                  {brand.description?.trim() || "توضیحاتی برای این برند ثبت نشده است."}
                </p>

                {brand.productCount > 0 && (
                  <Link
                    href={`/search?q=${encodeURIComponent(brand.name)}`}
                    className="self-start rounded-full bg-brand px-5 py-2 text-[0.88rem] font-semibold text-white transition-colors duration-200 hover:bg-brand-dark"
                  >
                    مشاهده محصولات ({toPersianDigits(brand.productCount)})
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
