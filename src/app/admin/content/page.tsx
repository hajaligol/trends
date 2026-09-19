import { getHomeCategoryTiles, listHeroSlidesForAdmin, listPromoBannersForAdmin } from "@/domains/content/queries";
import { HeroSlideManager } from "@/components/admin/HeroSlideManager";
import { PromoBannerManager } from "@/components/admin/PromoBannerManager";
import { HomeCategoryTilesManager } from "@/components/admin/HomeCategoryTilesManager";

export const metadata = { title: "محتوای صفحه اصلی", robots: { index: false, follow: false } };

/**
 * Manages `hero_slides`/`promo_banners` (Phase 11's "hero slides" /
 * "homepage promotional content" admin task) — see those tables' header
 * comments for why there's no image-upload field here: there is still no
 * object-storage/CDN pipeline, so slides/banners keep rendering through
 * `AssetSlot` placeholders exactly as the demo fixtures did; only their
 * text content and ordering/active-state are editable.
 */
export default async function AdminContentPage() {
  const [heroSlides, promoBanners, categoryTiles] = await Promise.all([
    listHeroSlidesForAdmin(),
    listPromoBannersForAdmin(),
    getHomeCategoryTiles(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-[1.15rem] font-bold text-ink">اسلایدهای هدر (Hero)</h1>
        <HeroSlideManager slides={heroSlides} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[1.15rem] font-bold text-ink">دسته‌بندی‌های صفحه اصلی</h2>
        <p className="text-[0.85rem] text-text-secondary">
          تصویر هر یک از شش مربع دسته‌بندی صفحه اصلی را اینجا انتخاب کنید. تا زمانی که تصویری انتخاب نشود، یک جای‌نما نمایش داده می‌شود.
        </p>
        <HomeCategoryTilesManager tiles={categoryTiles} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[1.15rem] font-bold text-ink">بنرهای تبلیغاتی صفحه اصلی</h2>
        <PromoBannerManager banners={promoBanners} />
      </section>
    </div>
  );
}
