import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { getUserReviewForProduct, hasUserPurchasedProduct } from "@/domains/reviews/queries";
import type { ProductReviewSummary } from "@/domains/reviews/queries";
import { StarRating } from "@/components/catalog/StarRating";
import { ReviewForm } from "@/components/catalog/ReviewForm";
import { toPersianDigits } from "@/lib/utils/persian-digits";

const OWN_REVIEW_STATUS_LABELS = {
  pending: "دیدگاه شما ثبت شد و در انتظار بررسی است.",
  approved: null, // already visible in the public list below; no separate banner needed
  rejected: "دیدگاه شما توسط تیم ترندز تأیید نشد.",
} as const;

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

  let ownReviewPanel: React.ReactNode = null;
  if (session?.user) {
    const ownReview = await getUserReviewForProduct(session.user.id, productId);
    if (ownReview) {
      const label = OWN_REVIEW_STATUS_LABELS[ownReview.status];
      ownReviewPanel = label ? (
        <p className="rounded-[var(--radius-md)] bg-header px-4 py-3 text-[0.85rem] text-ink">{label}</p>
      ) : null;
    } else {
      const purchased = await hasUserPurchasedProduct(session.user.id, productId);
      ownReviewPanel = purchased ? (
        <ReviewForm productSlug={productSlug} />
      ) : (
        <p className="rounded-[var(--radius-md)] bg-header px-4 py-3 text-[0.85rem] text-text-secondary">
          فقط خریداران این محصول می‌توانند برای آن دیدگاه ثبت کنند.
        </p>
      );
    }
  } else {
    ownReviewPanel = (
      <p className="rounded-[var(--radius-md)] bg-header px-4 py-3 text-[0.85rem] text-text-secondary">
        برای ثبت دیدگاه، ابتدا{" "}
        <Link href="/login" className="underline underline-offset-2">
          وارد حساب کاربری
        </Link>{" "}
        خود شوید.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <h2 className="text-[1.05rem] font-bold text-ink">دیدگاه‌های مشتریان</h2>
        {summary.averageRating !== null && (
          <span className="flex items-center gap-1.5 text-[0.85rem] text-text-secondary">
            <StarRating rating={summary.averageRating} />
            {toPersianDigits(summary.averageRating)} از ۵ ({toPersianDigits(summary.approvedCount)} دیدگاه)
          </span>
        )}
      </div>

      {ownReviewPanel}

      {summary.reviews.length === 0 ? (
        <p className="text-[0.85rem] text-text-secondary">هنوز دیدگاهی برای این محصول ثبت نشده است.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {summary.reviews.map((review) => (
            <li key={review.id} className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-line p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StarRating rating={review.rating} />
                  <span className="text-[0.85rem] font-medium text-ink">{review.authorName}</span>
                  {review.isVerifiedPurchase && (
                    <span className="rounded-full bg-sage px-2 py-0.5 text-[0.72rem] text-ink">خرید تأیید شده</span>
                  )}
                </div>
                <span className="text-[0.75rem] text-text-secondary">
                  {new Intl.DateTimeFormat("fa-IR").format(review.createdAt)}
                </span>
              </div>
              {review.title && <p className="font-medium text-ink">{review.title}</p>}
              <p className="text-[0.88rem] leading-7 text-ink/85">{review.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
