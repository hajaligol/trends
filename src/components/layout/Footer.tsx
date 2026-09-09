import { Container } from "@/components/ui/Container";

// Mirrors reference/prototype.html <footer class="site-footer">.
// The newsletter form is presentational only in this phase — it is not
// wired to a real subscription endpoint yet. Real persistence + a Server
// Action land in Phase 12 (see TRENDS_PROJECT_CONTEXT.md §6 "Newsletter").
export function Footer() {
  return (
    <footer id="site-footer" className="border-t border-line bg-white pb-6 pt-[clamp(30px,4vw,46px)]">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-line pb-[clamp(26px,4vw,38px)] mb-6">
          <div>
            <h3 className="m-0 mb-1.5 text-[1.1rem] font-bold">عضویت در خبرنامه</h3>
            <p className="m-0 text-[0.85rem] text-text-secondary">
              از جدیدترین تخفیف‌ها و محصولات باخبر شوید.
            </p>
          </div>

          <form className="flex flex-wrap gap-2.5" aria-label="فرم عضویت در خبرنامه">
            <label htmlFor="newsletterEmail" className="sr-only">
              ایمیل
            </label>
            <input
              type="email"
              id="newsletterEmail"
              name="email"
              placeholder="آدرس ایمیل شما"
              required
              className="min-w-[220px] rounded-full border border-line bg-bg px-[18px] py-3 text-[0.88rem] focus:outline-2 focus:outline-ink focus:outline-offset-2"
            />
            <button
              type="submit"
              className="rounded-full bg-ink px-[26px] py-3 text-[0.88rem] text-white"
            >
              عضویت
            </button>
          </form>

          <div className="flex gap-2.5">
            {["اینستاگرام", "تلگرام", "فیسبوک", "ایکس"].map((label) => (
              <span
                key={label}
                role="img"
                aria-label={label}
                className="h-[34px] w-[34px] rounded-full bg-ink/6"
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-[1.2rem] font-bold">ترندز</span>
          <nav aria-label="لینک‌های فوتر" className="flex flex-wrap gap-[22px] text-[0.85rem] text-text-secondary">
            <a href="#hero">صفحه اصلی</a>
            <a href="#site-footer">درباره ما</a>
            <a href="#site-footer">تماس با ما</a>
            <a href="#site-footer">سوالات متداول</a>
          </nav>
          <span className="text-[0.8rem] text-text-secondary">
            © ۱۴۰۴ ترندز. تمامی حقوق محفوظ است.
          </span>
        </div>
      </Container>
    </footer>
  );
}
