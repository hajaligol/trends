import { countSubscribersByStatus, listSubscribersForAdmin } from "@/domains/newsletter/queries";
import { SubscriberActiveToggle } from "@/components/admin/SubscriberActiveToggle";
import { firstParam, normalizeSearchText, sanitizeDateRange, type RawParam } from "@/lib/utils/admin-filters";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import {
  buildHref,
  DateRangeFields,
  EmptyRow,
  FilterBar,
  FilterTabs,
  formatDate,
  PageHeader,
  Pagination,
  SearchField,
  TABLE,
  TD,
  TD_MUTED,
  TableCard,
  TH,
  THEAD,
  TR,
} from "@/components/admin/ui/layout";

export const metadata = { title: "خبرنامه", robots: { index: false, follow: false } };

export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: RawParam; q?: RawParam; status?: RawParam; from?: RawParam; to?: RawParam }>;
}) {
  const params = await searchParams;
  const page = Number(firstParam(params.page) ?? "1") || 1;
  const q = normalizeSearchText(params.q);
  const statusParam = firstParam(params.status);
  const status = statusParam === "active" || statusParam === "inactive" ? statusParam : undefined;
  const dateRange = sanitizeDateRange(params.from, params.to);
  const isFiltered = Boolean(q || dateRange.from || dateRange.to);
  const carried = { q, from: dateRange.from, to: dateRange.to };
  const [subscriberPage, counts] = await Promise.all([
    listSubscribersForAdmin({ q, status, dateRange, page }),
    countSubscribersByStatus({ q, dateRange }),
  ]);
  const tabHref = (value?: "active" | "inactive") => buildHref("/admin/newsletter", { ...carried, status: value });
  const totalPages = Math.max(1, Math.ceil(subscriberPage.total / subscriberPage.pageSize));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="مشترکین خبرنامه"
        description={`${toPersianDigits(counts.active + counts.inactive)} نفر${isFiltered ? " مطابق جستجو" : " در خبرنامه ثبت‌نام کرده‌اند"}. با کلید «وضعیت» می‌توانید اشتراک یک نفر را لغو یا دوباره فعال کنید.`}
      />

      <FilterTabs
        items={[
          { label: "همه", href: tabHref(), active: !status, count: counts.active + counts.inactive },
          { label: "فعال", href: tabHref("active"), active: status === "active", count: counts.active },
          { label: "لغو شده", href: tabHref("inactive"), active: status === "inactive", count: counts.inactive },
        ]}
      />

      <FilterBar resetHref={status ? `/admin/newsletter?status=${status}` : "/admin/newsletter"} isFiltered={isFiltered} submitLabel="جستجو">
        {status && <input type="hidden" name="status" value={status} />}
        <SearchField defaultValue={q} placeholder="جستجوی ایمیل..." />
        <DateRangeFields from={dateRange.from} to={dateRange.to} />
      </FilterBar>

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
              <EmptyRow colSpan={3}>{isFiltered || status ? "مشترکی مطابق این فیلتر پیدا نشد." : "هنوز مشترکی ثبت نشده است."}</EmptyRow>
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

      <Pagination pathname="/admin/newsletter" params={{ status, ...carried }} page={page} totalPages={totalPages} total={subscriberPage.total} pageSize={subscriberPage.pageSize} />
    </div>
  );
}
