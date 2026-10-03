import type { Metadata } from "next";
import "@/styles/globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { UIOverlayProvider } from "@/components/overlays/UIOverlayProvider";
import { SearchOverlay } from "@/components/overlays/SearchOverlay";
import { PageDim } from "@/components/overlays/PageDim";
import { CartDrawer } from "@/components/overlays/CartDrawer";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";
import { CartProvider } from "@/components/cart/CartProvider";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import { getCategoryTree } from "@/domains/catalog/queries";
import { toNavTree } from "@/domains/categories/tree";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | فروشگاه پوشاک`,
    template: `%s | ${SITE_NAME}`,
  },
  description: "ترندز، فروشگاه آنلاین پوشاک ایرانی.",
  openGraph: {
    siteName: SITE_NAME,
    locale: "fa_IR",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The header/footer menus render the live category tree. A failed read
  // is deliberately not swallowed: rendering (or, worse, statically
  // baking in) a site with an empty menu would be a quieter and much
  // harder-to-notice failure than an error.
  const navCategories = toNavTree(await getCategoryTree());

  return (
    <html lang="fa" dir="rtl">
      <body>
        <AuthSessionProvider>
          <CartProvider>
            <WishlistProvider>
              <ToastProvider>
                <UIOverlayProvider>
                  <Header categories={navCategories} />
                  {children}
                  <Footer categories={navCategories} />
                  <PageDim />
                  <SearchOverlay />
                  <CartDrawer />
                </UIOverlayProvider>
              </ToastProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
