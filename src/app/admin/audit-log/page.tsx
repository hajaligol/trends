import { listAuditLogEntityTypes, listAuditLogs } from "@/domains/analytics/audit";
import {
  EmptyRow,
  FilterBar,
  formatDateTime,
  PageHeader,
  Pagination,
  SelectInput,
  StatusBadge,
  TABLE,
  TD,
  TD_MUTED,
  TableCard,
  TH,
  THEAD,
  TR,
  type Tone,
} from "@/components/admin/ui/layout";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata = { title: "گزارش فعالیت‌ها", robots: { index: false, follow: false } };

const ACTION_LABELS: Record<string, string> = {
  "order.status_transition": "تغییر وضعیت سفارش",
  "category.create": "ایجاد دسته",
  "category.update": "ویرایش دسته",
  "category.delete": "حذف دسته",
  "product.create": "ایجاد محصول",
  "product.update": "ویرایش محصول",
  "product.delete": "حذف محصول",
  "product_variant.create": "ایجاد نوع محصول",
  "product_variant.update": "ویرایش نوع محصول",
  "product_variant.delete": "حذف نوع محصول",
  "product_image.create": "افزودن تصویر",
  "product_image.delete": "حذف تصویر",
  "inventory.adjust": "تغییر موجودی",
  "coupon.create": "ایجاد کد تخفیف",
  "coupon.update": "ویرایش کد تخفیف",
  "coupon.toggle_active": "تغییر وضعیت کد تخفیف",
  "hero_slide.create": "ایجاد اسلاید",
  "hero_slide.update": "ویرایش اسلاید",
  "hero_slide.delete": "حذف اسلاید",
  "promo_banner.create": "ایجاد بنر",
  "promo_banner.update": "ویرایش بنر",
  "promo_banner.delete": "حذف بنر",
  "settings.update": "ویرایش تنظیمات",
  "customer.role_change": "تغییر نقش کاربر",
};

const ENTITY_LABELS: Record<string, string> = {
  order: "سفارش",
  category: "دسته‌بندی",
  product: "محصول",
  product_variant: "نوع محصول",
  product_image: "تصویر محصول",
  inventory: "موجودی",
  coupon: "کد تخفیف",
  hero_slide: "اسلاید",
  promo_banner: "بنر",
  settings: "تنظیمات",
  customer: "مشتری",
};

/** Colour the action by what it did, so deletions stand out when scanning. */
function actionTone(action: string): Tone {
  if (action.endsWith(".delete")) return "danger";
  if (action.endsWith(".create")) return "success";
  if (action === "customer.role_change") return "purple";
  return "info";
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const [logPage, entityTypes] = await Promise.all([
    listAuditLogs({ entityType: params.entityType, page }),
    listAuditLogEntityTypes(),
  ]);
  const totalPages = Math.max(1, Math.ceil(logPage.total / logPage.pageSize));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="گزارش فعالیت‌ها"
        description={`${toPersianDigits(logPage.total)} رویداد ثبت شده. هر تغییر حساس در پنل مدیریت (چه کسی، چه کاری، چه زمانی) اینجا نگه‌داری می‌شود و قابل ویرایش نیست.`}
      />

      <FilterBar resetHref="/admin/audit-log" isFiltered={Boolean(params.entityType)}>
        <SelectInput name="entityType" defaultValue={params.entityType ?? ""} label="موضوع">
          <option value="">همه موضوعات</option>
          {entityTypes.map((entityType) => (
            <option key={entityType} value={entityType}>
              {ENTITY_LABELS[entityType] ?? entityType}
            </option>
          ))}
        </SelectInput>
      </FilterBar>

      <TableCard>
        <table className={`${TABLE} min-w-[760px]`}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>زمان</th>
              <th className={TH}>انجام‌دهنده</th>
              <th className={TH}>عملیات</th>
              <th className={TH}>موضوع</th>
              <th className={TH}>جزئیات</th>
            </tr>
          </thead>
          <tbody>
            {logPage.rows.length === 0 ? (
              <EmptyRow colSpan={5}>فعالیتی ثبت نشده است.</EmptyRow>
            ) : (
              logPage.rows.map((log) => (
                <tr key={log.id} className={`${TR} align-top`}>
                  <td className={`${TD_MUTED} whitespace-nowrap`}>{formatDateTime(log.createdAt)}</td>
                  <td className={TD_MUTED} dir="ltr">
                    <span className="block text-end">{log.actorMobile ? toPersianDigits(log.actorMobile.replace("+98", "0")) : "—"}</span>
                  </td>
                  <td className={TD}>
                    <StatusBadge tone={actionTone(log.action)}>{ACTION_LABELS[log.action] ?? log.action}</StatusBadge>
                  </td>
                  <td className={TD_MUTED}>
                    {ENTITY_LABELS[log.entityType] ?? log.entityType}
                    {log.entityId ? (
                      <span dir="ltr" className="ms-1.5 text-[0.74rem]">
                        {log.entityId.slice(0, 8)}
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-[300px] px-4 py-3.5">
                    {log.payload ? (
                      <details className="group text-[0.76rem] text-text-secondary">
                        <summary className="cursor-pointer list-none text-brand hover:underline">نمایش جزئیات</summary>
                        <pre dir="ltr" className="m-0 mt-2 max-h-40 overflow-auto rounded-[var(--radius-sm)] bg-bg p-2.5 text-start whitespace-pre-wrap break-all">
                          {log.payload}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      <Pagination
        pathname="/admin/audit-log"
        params={{ entityType: params.entityType }}
        page={page}
        totalPages={totalPages}
        total={logPage.total}
        pageSize={logPage.pageSize}
      />
    </div>
  );
}
