import Link from "next/link";
import { listReviewsForAdmin } from "@/domains/reviews/admin-queries";
import { ReviewModerationRow } from "@/components/admin/ReviewModerationRow";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import type { Review } from "@/lib/db/schema";

export const metadata = { title: "دیدگاه‌ها", robots: { index: false, follow: false } };

const STATUS_FILTERS: { value: Review["status"] | ""; label: string }[] = [
  { value: "", label: "همه" },
  { value: "pending", label: "در انتظار بررسی" },
  { value: "approved", label: "تأیید شده" },
  { value: "rejected", label: "رد شده" },
];

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = params.status && params.status !== "" ? (params.status as Review["status"]) : undefined;
  const page = Number(params.page ?? "1") || 1;
  const reviewPage = await listReviewsForAdmin({ status, page });
  const totalPages = Math.max(1, Math.ceil(reviewPage.total / reviewPage.pageSize));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[1.15rem] font-bold text-ink">دیدگاه‌ها</h1>

      <div className="flex flex-wrap gap-1.5 text-[0.82rem]">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={{ query: filter.value ? { status: filter.value } : {} }}
            className={`rounded-full px-4 py-2 ${
              (params.status ?? "") === filter.value ? "bg-ink text-white" : "bg-header text-ink hover:opacity-80"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {reviewPage.rows.length === 0 ? (
          <p className="rounded-[var(--radius-lg)] border border-line bg-white p-6 text-center text-[0.85rem] text-text-secondary">
            دیدگاهی یافت نشد
          </p>
        ) : (
          reviewPage.rows.map((review) => <ReviewModerationRow key={review.id} review={review} />)
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-[0.85rem]">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={{ query: { ...params, page: String(pageNumber) } }}
              className={`rounded-full px-3.5 py-1.5 ${
                pageNumber === page ? "bg-ink text-white" : "bg-header text-ink hover:opacity-80"
              }`}
            >
              {toPersianDigits(pageNumber)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
