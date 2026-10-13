import { listBrandsForAdmin } from "@/domains/brands/queries";
import { BrandForm } from "@/components/admin/BrandForm";
import { BrandRow } from "@/components/admin/BrandRow";
import { adminButton, Card, EmptyRow, PageHeader, TABLE, TableCard, TH, THEAD } from "@/components/admin/ui/layout";
import { PlusIcon } from "@/components/admin/ui/icons";

export const metadata = { title: "برندها", robots: { index: false, follow: false } };

export default async function AdminBrandsPage() {
  const brands = await listBrandsForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="برندها"
        description="برند هر محصول از میان همین فهرست انتخاب می‌شود. برند غیرفعال در فرم محصول پیشنهاد نمی‌شود و در فروشگاه نمایش داده نمی‌شود، ولی محصولاتش فعال می‌مانند. برندی که محصول دارد قابل حذف نیست؛ غیرفعالش کنید."
        actions={
          <a href="#new-brand" className={adminButton("primary", "md")}>
            <PlusIcon width={18} height={18} />
            برند جدید
          </a>
        }
      />

      <TableCard>
        <table className={`${TABLE} min-w-[720px]`}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>برند</th>
              <th className={TH}>نامک</th>
              <th className={TH}>محصولات</th>
              <th className={TH}>وضعیت</th>
              <th className={TH}>
                <span className="sr-only">عملیات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {brands.length === 0 ? (
              <EmptyRow colSpan={5}>هنوز برندی ثبت نشده است.</EmptyRow>
            ) : (
              brands.map((brand) => <BrandRow key={brand.id} brand={brand} />)
            )}
          </tbody>
        </table>
      </TableCard>

      <Card id="new-brand" title="افزودن برند جدید" description="نام برند یکتاست (بدون توجه به حروف بزرگ و کوچک لاتین).">
        <BrandForm />
      </Card>
    </div>
  );
}
