import Link from "next/link";
import { getAdminDashboardSummary } from "@/domains/admin/dashboard";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/domains/orders/lifecycle";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { ORDER_STATUS_TONES } from "@/components/admin/status";
import {
  adminButton,
  Card,
  EmptyRow,
  formatDate,
  PageHeader,
  StatCard,
  StatusBadge,
  TABLE,
  TD,
  TD_MUTED,
  TableCard,
  TH,
  THEAD,
  TR,
} from "@/components/admin/ui/layout";
import {
  ArchiveIcon,
  CheckCircleIcon,
  MessageIcon,
  PackageIcon,
  PlusIcon,
  StarIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/admin/ui/icons";

export const metadata = { title: "داشبورد مدیریت", robots: { index: false, follow: false } };

/**
 * Landing page for `/admin`. Top to bottom: the two headline numbers, then a
 * "needs your attention" row (red-dotted when non-zero, calm when all clear),
 * then the latest orders — so the first look every day answers "what should
 * I do right now?".
 */
export default async function AdminDashboardPage() {
  const summary = await getAdminDashboardSummary();

  const attention = [
    {
      label: "سفارش آماده رسیدگی",
      hint: "پرداخت‌شده و در انتظار ارسال",
      count: summary.ordersAwaitingAction,
      href: "/admin/orders?status=paid",
      icon: <PackageIcon />,
      color: "blue" as const,
    },
    {
      label: "کالای رو به اتمام",
      hint: "موجودی کمتر از آستانه",
      count: summary.lowStockVariantCount,
      href: "/admin/inventory",
      icon: <ArchiveIcon />,
      color: "yellow" as const,
    },
    {
      label: "دیدگاه در انتظار بررسی",
      hint: "نیازمند تأیید یا رد",
      count: summary.pendingReviewCount,
      href: "/admin/reviews?status=pending",
      icon: <StarIcon />,
      color: "lavender" as const,
    },
    {
      label: "پیام پشتیبانی بدون پاسخ",
      hint: "از فرم تماس با ما",
      count: summary.unresolvedSupportMessageCount,
      href: "/admin/support?unresolved=1",
      icon: <MessageIcon />,
      color: "pink" as const,
    },
  ];
  const allClear = attention.every((item) => item.count === 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="داشبورد"
        description="خلاصه‌ای از وضعیت فروشگاه و کارهایی که امروز منتظر شما هستند."
        actions={
          <>
            <Link href="/admin/coupons/new" className={adminButton("secondary", "md")}>
              کد تخفیف جدید
            </Link>
            <Link href="/admin/products/new" className={adminButton("primary", "md")}>
              <PlusIcon width={18} height={18} />
              محصول جدید
            </Link>
          </>
        }
      />

      <section aria-label="آمار کلی" className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="درآمد این ماه"
          value={formatToman(summary.revenueThisMonthToman)}
          hint="سفارش‌های پرداخت‌شده، در حال آماده‌سازی، ارسال‌شده و تحویل‌شده"
          icon={<WalletIcon />}
          color="sage"
          href="/admin/orders"
        />
        <StatCard
          label="تعداد مشتریان"
          value={toPersianDigits(summary.totalCustomers)}
          hint="حساب‌های ثبت‌نام‌شده"
          icon={<UsersIcon />}
          color="aqua"
          href="/admin/customers"
        />
      </section>

      <section aria-labelledby="attention-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="attention-title" className="m-0 text-[1.05rem] font-bold text-ink">
            نیازمند توجه
          </h2>
          {allClear && (
            <span className="inline-flex items-center gap-1.5 text-[0.82rem] text-[#4f5f2a]">
              <CheckCircleIcon width={17} height={17} />
              فعلاً همه‌چیز مرتب است
            </span>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {attention.map((item) => (
            <StatCard
              key={item.label}
              label={item.label}
              value={toPersianDigits(item.count)}
              hint={item.hint}
              icon={item.icon}
              color={item.color}
              href={item.href}
              attention={item.count > 0}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="recent-orders-title" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-orders-title" className="m-0 text-[1.05rem] font-bold text-ink">
            سفارش‌های اخیر
          </h2>
          <Link href="/admin/orders" className="text-[0.84rem] font-medium text-brand hover:underline">
            مشاهده همه سفارش‌ها
          </Link>
        </div>
        <TableCard>
          <table className={`${TABLE} min-w-[560px]`}>
            <thead className={THEAD}>
              <tr>
                <th className={TH}>شماره سفارش</th>
                <th className={TH}>وضعیت</th>
                <th className={TH}>مبلغ</th>
                <th className={TH}>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentOrders.length === 0 ? (
                <EmptyRow colSpan={4}>هنوز سفارشی ثبت نشده است.</EmptyRow>
              ) : (
                summary.recentOrders.map((order) => (
                  <tr key={order.orderNumber} className={TR}>
                    <td className={TD}>
                      <Link
                        href={`/admin/orders/${order.orderNumber}`}
                        dir="ltr"
                        className="inline-block font-semibold text-ink hover:text-brand hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className={TD}>
                      <StatusBadge tone={ORDER_STATUS_TONES[order.status as OrderStatus] ?? "neutral"}>
                        {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                      </StatusBadge>
                    </td>
                    <td className={`${TD} font-semibold`}>{formatToman(order.totalToman)}</td>
                    <td className={TD_MUTED}>{formatDate(order.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableCard>
      </section>
    </div>
  );
}
