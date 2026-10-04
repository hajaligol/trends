"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Wraps the storefront-only chrome (header, footer, search overlay, page
 * dim) so it is not rendered around `/admin/**`, which has its own shell
 * (`components/admin/AdminShell`). The path check runs during SSR too, so
 * there is no flash of storefront navigation before it disappears.
 */
export function StoreChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return <>{children}</>;
}
