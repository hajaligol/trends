import Link from "next/link";
import { listSubscribersForAdmin } from "@/domains/newsletter/queries";
import { SubscriberActiveToggle } from "@/components/admin/SubscriberActiveToggle";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata = { title: "خبرنامه", robots: { index: false, follow: false } };

export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const subscriberPage = await listSubscribersForAdmin({ page });
  const totalPages = Math.max(1, Math.ceil(subscriberPage.total / subscriberPage.pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[1.15rem] font-bold text-ink">مشترکین خبرنامه</h1>
        <p className="mt-1 text-[0.82rem] text-text-secondary">
          مجموع: {toPersianDigits(subscriberPage.total)} نفر
        </p>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line">
        <table className="w-full min-w-[520px] text-[0.85rem]">
          <thead>
            <tr className="border-b border-line bg-header text-text-secondary">
              <th className="px-4 py-2.5 text-start font-medium">ایمیل</th>
              <th className="px-4 py-2.5 text-start font-medium">وضعیت</th>
              <th className="px-4 py-2.5 text-start font-medium">تاریخ عضویت</th>
            </tr>
          </thead>
          <tbody>
            {subscriberPage.rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-text-secondary">
                  هنوز مشترکی ثبت نشده است
                </td>
              </tr>
            ) : (
              subscriberPage.rows.map((subscriber) => (
                <tr key={subscriber.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5" dir="ltr">
                    {subscriber.email}
                  </td>
                  <td className="px-4 py-2.5">
                    <SubscriberActiveToggle id={subscriber.id} isActive={subscriber.isActive} />
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    {new Intl.DateTimeFormat("fa-IR").format(subscriber.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-[0.85rem]">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={{ query: { page: String(pageNumber) } }}
              className={`rounded-full px-3.5 py-1.5 ${
                pageNumber === page ? "bg-ink text-white" : "bg-header text-ink hover:opacity-80"
              }`}
            >
              {toPersianDigits(pageNumber)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
