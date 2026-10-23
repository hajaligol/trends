"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "@/components/ui/icons";

/**
 * Phones have no account sidebar (the account home is a list, see
 * `MobileAccountHome`), so every sub-page gets a back link to it. Renders
 * nothing on `/account` itself and from `lg` up.
 */
export function MobileAccountBack() {
  const pathname = usePathname();
  if (pathname === "/account") return null;
  return (
    <Link
      href="/account"
      className="-mb-2 inline-flex min-h-11 w-fit items-center gap-1 text-[0.92rem] font-semibold text-ink lg:hidden"
    >
      <ChevronRightIcon aria-hidden="true" className="h-5 w-5" />
      حساب کاربری
    </Link>
  );
}
