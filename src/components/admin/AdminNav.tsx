"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/admin", label: "داشبورد" },
  { href: "/admin/products", label: "محصولات" },
  { href: "/admin/categories", label: "دسته‌بندی‌ها" },
  { href: "/admin/inventory", label: "موجودی" },
  { href: "/admin/orders", label: "سفارش‌ها" },
  { href: "/admin/customers", label: "مشتریان" },
  { href: "/admin/coupons", label: "کدهای تخفیف" },
  { href: "/admin/reviews", label: "دیدگاه‌ها" },
  { href: "/admin/content", label: "محتوای صفحه اصلی" },
  { href: "/admin/newsletter", label: "خبرنامه" },
  { href: "/admin/support", label: "پیام‌های پشتیبانی" },
  { href: "/admin/settings", label: "تنظیمات" },
  { href: "/admin/audit-log", label: "گزارش فعالیت‌ها" },
];

/**
 * The nav renders every item to every staff/admin user — fine-grained
 * restrictions (e.g. role-changing being admin-only) are enforced by the
 * Server Actions themselves, not by hiding nav entries
 * (CLAUDE_BUILD_INSTRUCTIONS.txt §7 "Admin must not rely on hidden UI
 * alone for authorization" cuts both ways: hiding a link is not a
 * substitute for a real check, so there is no reason to bother hiding it
 * either).
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1.5 border-b border-line pb-4 text-[0.85rem]">
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 transition-colors ${
              isActive ? "bg-ink text-white" : "bg-header text-ink hover:opacity-80"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
