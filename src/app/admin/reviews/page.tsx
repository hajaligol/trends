import { listReviewsForAdmin } from "@/domains/reviews/admin-queries";
import { ReviewModerationRow } from "@/components/admin/ReviewModerationRow";
import { firstParam, normalizeSearchText, sanitizeDateRange, type RawParam } from "@/lib/utils/admin-filters";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import type { Review } from "@/lib/db/schema";
import {
  buildHref,
  DateRangeFields,
  EmptyState,
  FilterBar,
  FilterTabs,
  PageHeader,
  Pagination,
  SearchField,
  TextFilter,
} from "@/components/admin/ui/layout";
import { StarIcon } from "@/components/admin/ui/icons";

export const metadata = { title: "دیدگاه‌ها", robots: { index: false, follow: false } };

const STATUS_FILTERS: { value: Review["status"] | ""; label: string }[] = [
  { value: "pending", label: "در انتظار بررسی" },
  { value: "approved", label: "تأیید شده" },
  { value: "rejected", label: "رد شده" },
  { value: "", label: "همه" },
];

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: RawParam; page?: RawParam; user?: RawParam; product?: RawParam; q?: RawParam; from?: RawParam; to?: RawParam }>;
}) {
  const params = await searchParams;
  const statusParam = firstParam(params.status);
  const status = STATUS_FILTERS.some((filter) => filter.value && filter.value === statusParam) ? (statusParam as Review["status"]) : undefined;
  const page = Number(firstParam(params.page) ?? "1") || 1;
  const user = normalizeSearchText(params.user);
  const product = normalizeSearchText(params.product);
  const q = normalizeSearchText(params.q);
  const dateRange = sanitizeDateRange(params.from, params.to);
  const isFiltered = Boolean(user || product || q || dateRange.from || dateRange.to);

  const reviewPage = await listReviewsForAdmin({ status, user, product, q, dateRange, page });
  const totalPages = Math.max(1, Math.ceil(reviewPage.total / reviewPage.pageSize));

  // Filters that are not the status tab, carried through tab links and pagination.
  const carried = { user, product, q, from: dateRange.from, to: dateRange.to };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="دیدگاه‌ها"
        description="دیدگاه مشتریان تا زمانی که تأیید نشود در فروشگاه نمایش داده نمی‌شود. دیدگاه‌های «خرید تأیید شده» را مشتریانی نوشته‌اند که همان محصول را خریده‌اند."
      />

      <FilterTabs
        items={STATUS_FILTERS.map((filter) => ({
          label: filter.label,
          href: buildHref("/admin/reviews", { ...carried, status: filter.value || undefined }),
          active: (status ?? "") === filter.value,
        }))}
      />

      <FilterBar resetHref={status ? `/admin/reviews?status=${status}` : "/admin/reviews"} isFiltered={isFiltered} submitLabel="جستجو">
        {status && <input type="hidden" name="status" value={status} />}
        <TextFilter name="user" label="کاربر" defaultValue={user} placeholder="نام، ایمیل یا موبایل" />
        <TextFilter name="product" label="محصول" defaultValue={product} placeholder="نام، نامک یا کد محصول" />
        <DateRangeFields from={dateRange.from} to={dateRange.to} />
        <div className="min-w-[200px] flex-1">
          <SearchField defaultValue={q} placeholder="جستجو در متن دیدگاه..." />
        </div>
      </FilterBar>

      {reviewPage.rows.length === 0 ? (
        <EmptyState
          icon={<StarIcon width={26} height={26} />}
          title={isFiltered ? "دیدگاهی مطابق این فیلتر پیدا نشد" : status === "pending" ? "دیدگاهی در انتظار بررسی نیست" : "دیدگاهی یافت نشد"}
          description={isFiltered ? "عبارت جستجو یا بازه تاریخ را تغییر دهید." : status === "pending" ? "همه دیدگاه‌های ثبت‌شده بررسی شده‌اند." : undefined}
        />
      ) : (
        <>
          <p className="m-0 text-[0.82rem] text-text-secondary">{toPersianDigits(reviewPage.total)} دیدگاه</p>
          <div className="flex flex-col gap-4">
            {reviewPage.rows.map((review) => (
              <ReviewModerationRow key={review.id} review={review} />
            ))}
          </div>
        </>
      )}

      <Pagination
        pathname="/admin/reviews"
        params={{ status, ...carried }}
        page={page}
        totalPages={totalPages}
        total={reviewPage.total}
        pageSize={reviewPage.pageSize}
      />
    </div>
  );
}
