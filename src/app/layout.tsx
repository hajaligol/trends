import type { Metadata } from "next";
import "@/styles/globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { UIOverlayProvider } from "@/components/overlays/UIOverlayProvider";
import { SearchOverlay } from "@/components/overlays/SearchOverlay";
import { CartDrawer } from "@/components/overlays/CartDrawer";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";
import { CartProvider } from "@/components/cart/CartProvider";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <AuthSessionProvider>
          <CartProvider>
            <WishlistProvider>
              <UIOverlayProvider>
                <Header />
                {children}
                <Footer />
                <SearchOverlay />
                <CartDrawer />
              </UIOverlayProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
