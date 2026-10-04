import { listSubscribersForAdmin } from "@/domains/newsletter/queries";
import { SubscriberActiveToggle } from "@/components/admin/SubscriberActiveToggle";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { EmptyRow, formatDate, PageHeader, Pagination, TABLE, TD, TD_MUTED, TableCard, TH, THEAD, TR } from "@/components/admin/ui/layout";

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
    <div className="flex flex-col gap-5">
      <PageHeader
        title="مشترکین خبرنامه"
        description={`${toPersianDigits(subscriberPage.total)} نفر در خبرنامه ثبت‌نام کرده‌اند. با کلید «وضعیت» می‌توانید اشتراک یک نفر را لغو یا دوباره فعال کنید.`}
      />

      <TableCard>
        <table className={`${TABLE} min-w-[520px]`}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>ایمیل</th>
              <th className={TH}>وضعیت</th>
              <th className={TH}>تاریخ عضویت</th>
            </tr>
          </thead>
          <tbody>
            {subscriberPage.rows.length === 0 ? (
              <EmptyRow colSpan={3}>هنوز مشترکی ثبت نشده است.</EmptyRow>
            ) : (
              subscriberPage.rows.map((subscriber) => (
                <tr key={subscriber.id} className={TR}>
                  <td className={`${TD} font-medium`} dir="ltr">
                    <span className="block text-end">{subscriber.email}</span>
                  </td>
                  <td className={TD}>
                    <SubscriberActiveToggle id={subscriber.id} isActive={subscriber.isActive} />
                  </td>
                  <td className={TD_MUTED}>{formatDate(subscriber.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      <Pagination pathname="/admin/newsletter" params={{}} page={page} totalPages={totalPages} total={subscriberPage.total} pageSize={subscriberPage.pageSize} />
    </div>
  );
}
