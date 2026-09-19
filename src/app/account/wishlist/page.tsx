import type { Metadata } from "next";
import { getCurrentUser } from "@/domains/auth/actions";
import { getWishlistProductsForUser } from "@/domains/wishlist/queries";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { DashboardWishlistIcon } from "@/components/ui/dashboard-icons";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata: Metadata = {
  title: "علاقه‌مندی‌های من",
  robots: { index: false, follow: false },
};

/**
 * This page is naturally excluded from static generation already (it
 * sits under `/account`, whose layout calls `auth()`), so — unlike the
 * homepage/category/search pages — it's the one place in the app that's
 * allowed to just read wishlist product data server-side without the
 * "don't call auth() in a Server Component render" concern
 * `WishlistProvider`'s comment explains.
 */
export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) return null; // Parent layout already redirects; defensive only.

  const products = await getWishlistProductsForUser(user.id);

  return (
    <div className="flex flex-col gap-6">
      <AccountPageHeader
        icon={<DashboardWishlistIcon className="h-6 w-6" />}
        title="علاقه‌مندی‌های من"
        description={
          products.length > 0
            ? `${toPersianDigits(products.length)} محصول ذخیره‌شده`
            : "محصولات مورد علاقه‌تان را اینجا نگه دارید"
        }
      />
      <ProductGrid products={products} emptyMessage="هنوز محصولی به علاقه‌مندی‌ها اضافه نکرده‌اید." />
    </div>
  );
}
