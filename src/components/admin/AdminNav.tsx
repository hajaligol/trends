"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import type { AdminNavBadges } from "@/domains/admin/dashboard";
import {
  ArchiveIcon,
  DashboardIcon,
  HistoryIcon,
  ImageIcon,
  LayersIcon,
  MailIcon,
  MessageIcon,
  SettingsIcon,
  ShirtIcon,
  StarIcon,
  TicketIcon,
  UsersIcon,
  PackageIcon,
} from "@/components/admin/ui/icons";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
type NavItem = { href: string; label: string; icon: Icon; badge?: keyof AdminNavBadges };
type NavGroup = { title: string | null; items: NavItem[] };

/** Navigation grouped by what an operator is doing, not by database table. */
export const NAV_GROUPS: NavGroup[] = [
  { title: null, items: [{ href: "/admin", label: "داشبورد", icon: DashboardIcon }] },
  {
    title: "فروش",
    items: [
      { href: "/admin/orders", label: "سفارش‌ها", icon: PackageIcon, badge: "orders" },
      { href: "/admin/customers", label: "مشتریان", icon: UsersIcon },
      { href: "/admin/coupons", label: "کدهای تخفیف", icon: TicketIcon },
    ],
  },
  {
    title: "کاتالوگ",
    items: [
      { href: "/admin/products", label: "محصولات", icon: ShirtIcon },
      { href: "/admin/categories", label: "دسته‌بندی‌ها", icon: LayersIcon },
      { href: "/admin/inventory", label: "موجودی", icon: ArchiveIcon, badge: "inventory" },
    ],
  },
  {
    title: "ارتباط و محتوا",
    items: [
      { href: "/admin/reviews", label: "دیدگاه‌ها", icon: StarIcon, badge: "reviews" },
      { href: "/admin/support", label: "پیام‌های پشتیبانی", icon: MessageIcon, badge: "support" },
      { href: "/admin/content", label: "محتوای صفحه اصلی", icon: ImageIcon },
      { href: "/admin/newsletter", label: "خبرنامه", icon: MailIcon },
    ],
  },
  {
    title: "سیستم",
    items: [
      { href: "/admin/settings", label: "تنظیمات", icon: SettingsIcon },
      { href: "/admin/audit-log", label: "گزارش فعالیت‌ها", icon: HistoryIcon },
    ],
  },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The nav renders every item to every staff/admin user — fine-grained
 * restrictions (e.g. role-changing being admin-only) are enforced by the
 * Server Actions themselves, not by hiding nav entries
 * (CLAUDE_BUILD_INSTRUCTIONS.txt §7 "Admin must not rely on hidden UI
 * alone for authorization" cuts both ways: hiding a link is not a
 * substitute for a real check, so there is no reason to bother hiding it
 * either).
 *
 * Badges are informational counts only (see `getAdminNavBadges`).
 */
export function AdminNav({ badges, onNavigate }: { badges: AdminNavBadges; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="منوی مدیریت" className="flex flex-col gap-3.5">
      {NAV_GROUPS.map((group, index) => (
        <div key={group.title ?? index} className="flex flex-col gap-1">
          {group.title && (
            <p className="m-0 mb-0.5 px-3.5 text-[0.7rem] font-semibold tracking-wide text-text-secondary/80">{group.title}</p>
          )}
          {group.items.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            const count = item.badge ? badges[item.badge] : 0;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-2 text-[0.88rem] transition-colors ${
                  active ? "bg-ink font-semibold text-white" : "text-ink/80 hover:bg-header-bg hover:text-ink"
                }`}
              >
                <Icon width={19} height={19} className="shrink-0" />
                <span className="flex-1">{item.label}</span>
                {count > 0 && (
                  <span
                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] font-bold ${
                      active ? "bg-white text-ink" : "bg-red-500 text-white"
                    }`}
                    aria-label={`${toPersianDigits(count)} مورد نیازمند توجه`}
                  >
                    {count > 99 ? `${toPersianDigits(99)}+` : toPersianDigits(count)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
