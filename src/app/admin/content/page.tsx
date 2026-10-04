import { getHomeCategoryTiles, listHeroSlidesForAdmin, listPromoBannersForAdmin } from "@/domains/content/queries";
import { HeroSlideManager } from "@/components/admin/HeroSlideManager";
import { PromoBannerManager } from "@/components/admin/PromoBannerManager";
import { HomeCategoryTilesManager } from "@/components/admin/HomeCategoryTilesManager";
import { Card, PageHeader } from "@/components/admin/ui/layout";

export const metadata = { title: "محتوای صفحه اصلی", robots: { index: false, follow: false } };

/**
 * Manages `hero_slides`/`promo_banners`/home category tiles — the
 * "hero slides" / "homepage promotional content" admin tasks. Images are
 * uploaded through `ImagePicker`; only the content, ordering and
 * active-state of each block is edited here.
 */
export default async function AdminContentPage() {
  const [heroSlides, promoBanners, categoryTiles] = await Promise.all([
    listHeroSlidesForAdmin(),
    listPromoBannersForAdmin(),
    getHomeCategoryTiles(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="محتوای صفحه اصلی" description="آنچه مشتری در بالای صفحه اصلی و بخش‌های تبلیغاتی می‌بیند را از اینجا مدیریت کنید." />

      <Card title="اسلایدهای بالای صفحه (Hero)" description="تصاویر بزرگ و چرخان بالای صفحه اصلی.">
        <HeroSlideManager slides={heroSlides} />
      </Card>

      <Card
        title="دایره‌های دسته‌بندی صفحه اصلی"
        description="تصویر هر یک از شش دسته‌بندی صفحه اصلی را انتخاب کنید. تا زمانی که تصویری انتخاب نشود، یک جای‌نما نمایش داده می‌شود."
      >
        <HomeCategoryTilesManager tiles={categoryTiles} />
      </Card>

      <Card title="بنرهای تبلیغاتی" description="بنرهای میانه صفحه اصلی برای معرفی کالکشن‌ها و تخفیف‌ها.">
        <PromoBannerManager banners={promoBanners} />
      </Card>
    </div>
  );
}
