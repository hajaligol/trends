import { BlogCommentForm } from "@/components/blog/BlogCommentForm";
import { formatBlogDate, isoDate } from "@/domains/blog/format";
import type { PublicBlogComment } from "@/domains/blog/queries";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/** «دیدگاه‌ها»: approved comments (server-rendered, so they are indexable) + the form. */
export function BlogComments({ postSlug, comments, loginHref }: { postSlug: string; comments: PublicBlogComment[]; loginHref: string }) {
  return (
    <section id="comments" aria-labelledby="comments-title" className="scroll-mt-6">
      <h2 id="comments-title" className="m-0 mb-5 text-[clamp(1.2rem,2.2vw,1.5rem)] font-bold text-ink">
        دیدگاه‌ها {comments.length > 0 && <span className="text-[0.9em] font-semibold text-text-secondary">({toPersianDigits(comments.length)})</span>}
      </h2>

      {comments.length === 0 ? (
        <p className="m-0 mb-5 text-[0.95rem] text-text-secondary">هنوز دیدگاهی ثبت نشده است. اولین نفر باشید.</p>
      ) : (
        <ol className="m-0 mb-6 flex list-none flex-col gap-3 p-0">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-[18px] border border-line bg-white p-4 sm:p-5">
              <div className="mb-2 flex items-center gap-3">
                <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-lavender text-[0.95rem] font-bold text-ink">
                  {Array.from(comment.authorName)[0]}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-[0.92rem] font-semibold text-ink">{comment.authorName}</span>
                  <time dateTime={isoDate(comment.createdAt)} className="text-[0.76rem] text-text-secondary">
                    {formatBlogDate(comment.createdAt)}
                  </time>
                </div>
              </div>
              {/* Plain text: React escapes it; whitespace/newlines are preserved. */}
              <p className="m-0 whitespace-pre-line text-[0.95rem] leading-8 text-ink/90">{comment.body}</p>
            </li>
          ))}
        </ol>
      )}

      <BlogCommentForm postSlug={postSlug} loginHref={loginHref} />
    </section>
  );
}
