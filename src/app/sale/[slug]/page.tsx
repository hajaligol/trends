import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { CollectionPagination } from "@/components/catalog/CollectionPagination";
import { CampaignCountdown } from "@/components/catalog/CampaignCountdown";
import { buttonClasses } from "@/components/ui/Button";
import { getCampaignLanding } from "@/domains/campaigns/landing";
import { campaignHref } from "@/domains/campaigns/slug";
import { normalizeSlugParam } from "@/domains/catalog/slug";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type SalePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function resolve(props: SalePageProps) {
  const { slug: rawSlug } = await props.params;
  const slug = normalizeSlugParam(rawSlug);
  const searchParams = await props.searchParams;
  const pageParam = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const parsed = pageParam ? Number.parseInt(pageParam, 10) : 1;
  return { slug, requestedPage: Number.isFinite(parsed) && parsed > 0 ? parsed : 1 };
}

export async function generateMetadata(props: SalePageProps): Promise<Metadata> {
  const { slug, requestedPage } = await resolve(props);
  const landing = await getCampaignLanding(slug, requestedPage);
  if (!landing) return { title: "کمپین یافت نشد", robots: { index: false, follow: false } };
  if (landing.state === "ended") return { title: landing.name, robots: { index: false, follow: true } };
  const path = campaignHref(slug);
  return {
    title: landing.name,
    description: landing.description ?? `${landing.name}: ${landing.summary}`,
    alternates: { canonical: path },
    openGraph: { url: path },
    robots: requestedPage > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function SalePage(props: SalePageProps) {
  const { slug, requestedPage } = await resolve(props);
  const landing = await getCampaignLanding(slug, requestedPage);
  if (!landing) notFound();

  if (landing.state === "ended") {
    return (
      <main className="py-[clamp(40px,8vw,90px)]">
        <Container className="flex flex-col items-center gap-4 text-center">
          <h1 className="m-0 text-[clamp(1.5rem,3vw,2.1rem)] font-bold">{landing.name}</h1>
          <p className="m-0 text-text-secondary">این کمپین به پایان رسیده است.</p>
          <Link href="/" className={buttonClasses("primary")}>
            بازگشت به فروشگاه
          </Link>
        </Container>
      </main>
    );
  }

  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <Breadcrumbs items={[{ label: "صفحه اصلی", href: "/" }, { label: landing.name }]} />

        <header className="mb-8 flex flex-col gap-2 rounded-[22px] bg-blush px-[clamp(20px,4vw,40px)] py-[clamp(20px,3vw,32px)]">
          <h1 className="m-0 text-[clamp(1.5rem,3vw,2.1rem)] font-bold">{landing.name}</h1>
          <p className="m-0 text-[1rem] font-semibold text-brand-dark">{landing.summary}</p>
          {landing.description && <p className="m-0 max-w-[60ch] text-[0.92rem] leading-7 text-ink/80">{landing.description}</p>}
          {landing.countdownEndsAt && (
            <p className="m-0 text-[0.88rem] text-text-secondary">
              زمان باقی‌مانده: <CampaignCountdown endsAt={landing.countdownEndsAt} />
            </p>
          )}
          {landing.total > 0 && <p className="m-0 text-[0.84rem] text-text-secondary">{toPersianDigits(landing.total)} محصول مشمول این کمپین</p>}
        </header>

        <ProductGrid products={landing.products} emptyMessage="در حال حاضر محصولی مشمول این کمپین نیست." />
        <CollectionPagination basePath={campaignHref(slug)} page={landing.page} totalPages={landing.totalPages} />
      </Container>
    </main>
  );
}
