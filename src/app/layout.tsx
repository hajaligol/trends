import type { Metadata } from "next";
import "@/styles/globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { UIOverlayProvider } from "@/components/overlays/UIOverlayProvider";
import { SearchOverlay } from "@/components/overlays/SearchOverlay";
import { CartDrawer } from "@/components/overlays/CartDrawer";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";

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
          <UIOverlayProvider>
            <Header />
            {children}
            <Footer />
            <SearchOverlay />
            <CartDrawer />
          </UIOverlayProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
