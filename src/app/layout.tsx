import type { Metadata } from "next";
import "@/styles/globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { UIOverlayProvider } from "@/components/overlays/UIOverlayProvider";
import { SearchOverlay } from "@/components/overlays/SearchOverlay";
import { CartDrawer } from "@/components/overlays/CartDrawer";

export const metadata: Metadata = {
  title: {
    default: "ترندز | فروشگاه پوشاک",
    template: "%s | ترندز",
  },
  description: "ترندز، فروشگاه آنلاین پوشاک ایرانی.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <UIOverlayProvider>
          <Header />
          {children}
          <Footer />
          <SearchOverlay />
          <CartDrawer />
        </UIOverlayProvider>
      </body>
    </html>
  );
}
