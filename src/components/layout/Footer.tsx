import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { NewsletterForm } from "@/components/layout/NewsletterForm";

// Mirrors reference/prototype.html <footer class="site-footer">.
// Phase 12 wired the newsletter form to a real Server Action
// (`NewsletterForm`) and replaced the dead `#site-footer` anchor links
// with real routes (see TRENDS_PROJECT_CONTEXT.md §6 "Newsletter" and
// CLAUDE_BUILD_INSTRUCTIONS.txt Phase 12's public content-page tasks).
const socialIcons = [
  { label: "اینستاگرام", src: "/assets/icons/instagram.svg" },
  { label: "تلگرام", src: "/assets/icons/telegram.svg" },
  { label: "فیسبوک", src: "/assets/icons/facebook.svg" },
  { label: "ایکس", src: "/assets/icons/x.svg" },
];

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

          <NewsletterForm />

          <div className="flex gap-2.5">
            {socialIcons.map(({ label, src }) => (
              <span
                key={label}
                role="img"
                aria-label={label}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-ink/6"
              >
                <img
                  src={src}
                  alt=""
                  className="h-[18px] w-[18px] object-contain"
                />
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-[1.2rem] font-bold">ترندز</span>
          <nav aria-label="لینک‌های فوتر" className="flex flex-wrap gap-[22px] text-[0.85rem] text-text-secondary">
            <Link href="/">صفحه اصلی</Link>
            <Link href="/about">درباره ما</Link>
            <Link href="/contact">تماس با ما</Link>
            <Link href="/faq">سوالات متداول</Link>
            <Link href="/shipping-policy">راهنمای ارسال</Link>
            <Link href="/returns-policy">بازگشت کالا</Link>
            <Link href="/privacy-policy">حریم خصوصی</Link>
            <Link href="/terms">قوانین و مقررات</Link>
          </nav>
          <span className="text-[0.8rem] text-text-secondary">
            © ۱۴۰۴ ترندز. تمامی حقوق محفوظ است.
          </span>
        </div>
      </Container>
    </footer>
  );
}
