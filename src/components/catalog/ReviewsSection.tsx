import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { getUserReviewForProduct, hasUserPurchasedProduct } from "@/domains/reviews/queries";
import type { ProductReviewSummary } from "@/domains/reviews/queries";
import { StarRating } from "@/components/catalog/StarRating";
import { ReviewForm } from "@/components/catalog/ReviewForm";
import { RatingStarIcon } from "@/components/ui/icons";
import { toPersianDigits } from "@/lib/utils/persian-digits";

const OWN_REVIEW_STATUS_LABELS = {
  pending: "دیدگاه شما ثبت شد و در انتظار بررسی است.",
  approved: null, // already visible in the public list below; no separate banner needed
  rejected: "دیدگاه شما توسط تیم ترندز تأیید نشد.",
} as const;

const AVATAR_TONES = ["bg-lavender", "bg-blush", "bg-sage", "bg-aqua", "bg-yellow", "bg-blue"] as const;

/**
 * Assembles the product detail page's reviews section end to end:
 * approved reviews + average rating (`summary`, fetched once by the page
 * itself so the same read also feeds the page's JSON-LD
 * `aggregateRating` without querying twice) plus, for a signed-in
 * customer, either their own review's moderation status or a submission
 * form, decided by real server-side reads (`hasUserPurchasedProduct`,
 * `getUserReviewForProduct`), not a client guess. A signed-out visitor
 * sees a sign-in prompt instead of the form.
 */
export async function ReviewsSection({
  productId,
  productSlug,
  summary,
}: {
  productId: string;
  productSlug: string;
  summary: ProductReviewSummary;
}) {
  const session = await auth();

  const notice = "rounded-[var(--radius-md)] bg-header-bg px-4 py-3 text-[0.85rem] leading-7";

  let ownReviewPanel: React.ReactNode = null;
  if (session?.user) {
    const ownReview = await getUserReviewForProduct(session.user.id, productId);
    if (ownReview) {
      const label = OWN_REVIEW_STATUS_LABELS[ownReview.status];
      ownReviewPanel = label ? <p className={`${notice} text-ink`}>{label}</p> : null;
    } else {
      const purchased = await hasUserPurchasedProduct(session.user.id, productId);
      ownReviewPanel = purchased ? (
        <ReviewForm productSlug={productSlug} />
      ) : (
        <p className={`${notice} text-text-secondary`}>فقط خریداران این محصول می‌توانند برای آن دیدگاه ثبت کنند.</p>
      );
    }
  } else {
    ownReviewPanel = (
      <p className={`${notice} text-text-secondary`}>
        برای ثبت دیدگاه، ابتدا{" "}
        <Link href="/login" className="font-medium text-ink underline underline-offset-2">
          وارد حساب کاربری
        </Link>{" "}
        خود شوید.
      </p>
    );
  }

  // Star distribution comes from the same approved list the page already
  // fetched — no extra query. Display-only; the average itself is computed
  // server-side in `getApprovedReviewsForProduct`.
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: summary.reviews.filter((review) => review.rating === stars).length,
  }));
  const dateFormat = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" });

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-10">
      <h2 className="sr-only">دیدگاه‌های مشتریان</h2>

      <div className="flex flex-col gap-4 lg:self-start">
        <div className="rounded-[var(--radius-lg)] bg-benefit-bg p-6">
          {summary.averageRating !== null ? (
            <>
              <div className="flex items-center gap-4">
                <span className="text-[2.6rem] leading-none font-bold">
                  {toPersianDigits(summary.averageRating).replace(".", "٫")}
                </span>
                <div className="flex flex-col gap-1">
                  <StarRating rating={summary.averageRating} size="1.6rem" />
                  <span className="text-[0.82rem] text-text-secondary">
                    از {toPersianDigits(summary.approvedCount)} دیدگاه
                  </span>
                </div>
              </div>
              <ul className="mt-5 flex flex-col gap-2" aria-label="توزیع امتیازها">
                {distribution.map(({ stars, count }) => (
                  <li key={stars} className="flex items-center gap-3 text-[0.8rem] text-text-secondary">
                    <span className="flex w-9 shrink-0 items-center gap-1">
                      {toPersianDigits(stars)}
                      <RatingStarIcon filled style={{ width: 14, height: 14 }} />
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                      <span
                        className="block h-full rounded-full bg-ink"
                        style={{ width: `${(count / summary.approvedCount) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-end">{toPersianDigits(count)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="font-semibold">هنوز امتیازی ثبت نشده است</p>
              <p className="text-[0.85rem] text-text-secondary">اولین نفری باشید که نظر خود را می‌نویسد.</p>
            </div>
          )}
        </div>

        {ownReviewPanel}
      </div>

      <div>
        {summary.reviews.length === 0 ? (
          <p className="rounded-[var(--radius-lg)] border border-dashed border-line px-6 py-10 text-center text-[0.9rem] text-text-secondary">
            هنوز دیدگاهی برای این محصول ثبت نشده است.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {summary.reviews.map((review, index) => (
              <li
                key={review.id}
                className="flex flex-col gap-2.5 rounded-[var(--radius-lg)] border border-line bg-white p-5"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.95rem] font-semibold text-ink ${
                      AVATAR_TONES[index % AVATAR_TONES.length]
                    }`}
                  >
                    {Array.from(review.authorName)[0]}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[0.9rem] font-semibold text-ink">{review.authorName}</span>
                      {review.isVerifiedPurchase && (
                        <span className="rounded-full bg-sage px-2 py-0.5 text-[0.72rem] text-ink">
                          خرید تأیید شده
                        </span>
                      )}
                    </div>
                    <span className="text-[0.75rem] text-text-secondary">{dateFormat.format(review.createdAt)}</span>
                  </div>
                  <StarRating rating={review.rating} size="1.3rem" />
                </div>
                {review.title && <p className="font-semibold text-ink">{review.title}</p>}
                <p className="text-[0.9rem] leading-7 whitespace-pre-line text-ink/85">{review.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
