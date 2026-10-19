import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductListing } from "@/components/catalog/ProductListing";
import { ListingFilterBar } from "@/components/catalog/filters/ListingFilterBar";
import { ListingPagination } from "@/components/catalog/ListingPagination";
import { CampaignCountdown } from "@/components/catalog/CampaignCountdown";
import { buttonClasses } from "@/components/ui/Button";
import { getCampaignLanding } from "@/domains/campaigns/landing";
import { campaignHref } from "@/domains/campaigns/slug";
import {
  buildListingHref,
  countActiveFilters,
  isDefaultListing,
  parseListingFilters,
  type ListingFilters,
} from "@/domains/catalog/listing-filters";
import { DEFAULT_PRODUCT_SORT, listingProgress, listingWindowFor } from "@/domains/catalog/presentation";
import { normalizeSlugParam } from "@/domains/catalog/slug";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type SalePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** `getCampaignLanding(slug, ...)` arguments for the infinite-scroll window. */
function landingArgs(requestedPage: number, filters: ListingFilters): [number, Date, number, ListingFilters] {
  const window = listingWindowFor(requestedPage);
  return [window.fetchPage, new Date(), window.pageSpan, filters];
}

async function resolve(props: SalePageProps) {
  const { slug: rawSlug } = await props.params;
  const slug = normalizeSlugParam(rawSlug);
  const searchParams = await props.searchParams;
  const pageParam = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const parsed = pageParam ? Number.parseInt(pageParam, 10) : 1;
  return {
    slug,
    requestedPage: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
    filters: parseListingFilters(searchParams),
  };
}

export async function generateMetadata(props: SalePageProps): Promise<Metadata> {
  const { slug, requestedPage, filters } = await resolve(props);
  const landing = await getCampaignLanding(slug, ...landingArgs(requestedPage, filters));
  if (!landing) return { title: "کمپین یافت نشد", robots: { index: false, follow: false } };
  if (landing.state === "ended") return { title: landing.name, robots: { index: false, follow: true } };
  const path = campaignHref(slug);
  return {
    title: landing.name,
    description: landing.description ?? `${landing.name}: ${landing.summary}`,
    alternates: { canonical: path },
    openGraph: { url: path },
    robots: requestedPage > 1 || !isDefaultListing(filters) ? { index: false, follow: true } : undefined,
  };
}

export default async function SalePage(props: SalePageProps) {
  const { slug, requestedPage, filters } = await resolve(props);
  const window = listingWindowFor(requestedPage);
  const landing = await getCampaignLanding(slug, ...landingArgs(requestedPage, filters));
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

  const progress = listingProgress(window, requestedPage, landing.totalPages, landing.page);
  const basePath = campaignHref(slug);
  if (progress.clampedIntoInfiniteZone) redirect(buildListingHref(basePath, filters, { page: landing.page }));
  const showFilterBar = landing.total > 0 || countActiveFilters(filters) > 0;

  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <Breadcrumbs items={[{ label: "صفحه اصلی", href: "/" }, { label: landing.name }]} />

        {landing.heroImageUrl ? (
          /* Image hero: only the uploaded image (+ countdown). The box has the same fixed
             3:1 ratio as the recommended upload (IMAGE_SPECS.saleHero), so nothing is cropped. */
          <header className="relative mb-10 aspect-[3/1] overflow-hidden rounded-[var(--radius-lg)] bg-card-image">
            <h1 className="sr-only">{landing.name}</h1>
            <Image
              src={landing.heroImageUrl}
              alt=""
              fill
              priority
              sizes="(min-width: 1304px) 1240px, 100vw"
              className="object-cover"
              unoptimized={landing.heroImageUrl.endsWith(".gif")}
            />
            {landing.countdownEndsAt && (
              <div className="absolute bottom-2 end-2 rounded-[var(--radius-md)] bg-[#0b0712]/70 p-2 backdrop-blur-sm sm:bottom-4 sm:end-4 sm:p-3">
                <CampaignCountdown endsAt={landing.countdownEndsAt} variant="blocks" tone="dark" size="sm" />
              </div>
            )}
          </header>
        ) : (
        <header className="relative mb-10 overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-[linear-gradient(135deg,#0b0712_0%,#170c2b_50%,#2f1160_100%)] text-white">
          {/* Thin brand-purple rule along the top edge: flat gradient, no glow. */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(270deg,#7b2cc4_0%,#5b0fa5_45%,transparent_100%)]" />
          <div className="relative grid gap-8 px-[clamp(22px,4vw,48px)] py-[clamp(30px,4.5vw,52px)] md:grid-cols-[1fr_auto] md:items-center md:gap-14">
            <div className="flex flex-col items-start gap-4">
              <span className="text-[0.78rem] font-semibold tracking-wide text-lavender/80">کمپین ویژه ترندز</span>
              <h1 className="m-0 text-[clamp(1.7rem,3.4vw,2.6rem)] font-extrabold leading-[1.25] text-white">{landing.name}</h1>
              <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-lavender px-4 py-1.5 text-[0.9rem] font-semibold text-[#1d0c3a]">{landing.summary}</span>
              {landing.description && <p className="m-0 max-w-[58ch] text-[0.95rem] leading-8 text-white/75">{landing.description}</p>}
            </div>

            {(landing.countdownEndsAt || landing.total > 0) && (
              <div className="flex flex-col gap-5 border-t border-white/15 pt-6 md:min-w-[17rem] md:border-t-0 md:border-s md:ps-12 md:pt-0">
                {landing.countdownEndsAt && (
                  <div className="flex flex-col gap-3">
                    <span className="text-[0.82rem] font-semibold text-white/65">زمان باقی‌مانده تا پایان کمپین</span>
                    <CampaignCountdown endsAt={landing.countdownEndsAt} variant="blocks" tone="dark" />
                  </div>
                )}
                {landing.total > 0 && (
                  <p className="m-0 text-[0.88rem] text-white/65">
                    <span className="text-[1.15rem] font-bold text-white">{toPersianDigits(landing.total)}</span> محصول مشمول این کمپین
                  </p>
                )}
              </div>
            )}
          </div>
        </header>
        )}

        {showFilterBar && (
          <ListingFilterBar basePath={basePath} filters={filters} defaultSort={DEFAULT_PRODUCT_SORT} facets={landing.facets} />
        )}

        <ProductListing
          products={landing.products}
          emptyMessage={
            countActiveFilters(filters) > 0
              ? "محصولی با این مشخصات پیدا نشد."
              : "در حال حاضر محصولی مشمول این کمپین نیست."
          }
          total={landing.total}
          totalPages={landing.totalPages}
          infinite={window.infinite}
          loadedThrough={progress.loadedThrough}
          source={{ kind: "campaign", slug, filters }}
          baseHref={buildListingHref(basePath, filters)}
          pagination={(current) => (
            <ListingPagination
              basePath={basePath}
              filters={filters}
              defaultSort={DEFAULT_PRODUCT_SORT}
              page={current}
              totalPages={landing.totalPages}
            />
          )}
        />
      </Container>
    </main>
  );
}
