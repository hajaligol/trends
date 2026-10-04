"use client";

import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { deleteProductAction } from "@/domains/catalog/admin-actions";

export function DeleteProductButton({ productId, productTitle }: { productId: string; productTitle?: string }) {
  return (
    <ConfirmButton
      action={() => deleteProductAction(productId)}
      trigger="button"
      label="حذف محصول"
      title="حذف محصول"
      confirmMessage={`${productTitle ? `«${productTitle}»` : "این محصول"} همراه با همه انواع و تصاویرش حذف می‌شود. این عملیات قابل بازگشت نیست. اگر فقط نمی‌خواهید محصول در فروشگاه دیده شود، به‌جای حذف آن را غیرفعال کنید.`}
      confirmLabel="حذف محصول"
      successMessage="محصول حذف شد"
      redirectTo="/admin/products"
    />
  );
}
