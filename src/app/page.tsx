import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";

// This is a Phase 1 placeholder page: it exists to prove the design-system
// shell (tokens, header, footer, RTL, container) renders correctly end to
// end. The real homepage sections (hero carousel, categories, featured
// products, promo banners, new arrivals, benefits strip, search overlay,
// cart drawer) are rebuilt as components in Phase 2 per
// CLAUDE_BUILD_INSTRUCTIONS.txt.
export default function HomePage() {
  return (
    <main>
      <section id="hero" className="bg-hero-beige py-[clamp(20px,3vw,32px)]">
        <Container>
          <p className="mb-3.5 text-[0.88rem] text-text-secondary">
            کالکشن جدید
          </p>
          <h1 className="m-0 max-w-xl text-[clamp(1.8rem,4vw,2.6rem)] font-bold text-ink">
            پوشاکی که با سبک زندگی شما همراه می‌شود
          </h1>
          <p className="mt-4 max-w-md text-[0.95rem] text-text-secondary">
            بنیاد فنی سایت آماده است — بخش‌های اصلی صفحه اصلی (اسلایدر، دسته‌بندی‌ها،
            محصولات ویژه و ...) در فاز بعدی ساخته می‌شوند.
          </p>
          <ButtonLink href="#featured" className="mt-6">
            مشاهده فروشگاه
            <span aria-hidden="true">←</span>
          </ButtonLink>
        </Container>
      </section>

      <section id="categories" aria-label="دسته‌بندی‌ها" className="py-[clamp(34px,5vw,54px)]">
        <Container>
          <p className="text-sm text-text-secondary">
            بخش دسته‌بندی‌ها — فاز ۲
          </p>
        </Container>
      </section>

      <section id="featured" aria-label="محصولات ویژه" className="py-[clamp(34px,5vw,54px)]">
        <Container>
          <p className="text-sm text-text-secondary">
            بخش محصولات ویژه — فاز ۲
          </p>
        </Container>
      </section>

      <section id="collections" aria-label="کالکشن‌ها" className="py-[clamp(34px,5vw,54px)]">
        <Container>
          <p className="text-sm text-text-secondary">
            بخش بنرهای تبلیغاتی — فاز ۲
          </p>
        </Container>
      </section>
    </main>
  );
}
