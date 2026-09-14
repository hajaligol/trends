"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProductAction } from "@/domains/catalog/admin-actions";

export function DeleteProductButton({ productId }: { productId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        className="text-[0.82rem] text-red-600 underline underline-offset-2 hover:opacity-80 disabled:opacity-60"
        onClick={() => {
          if (!window.confirm("این محصول به‌طور کامل حذف شود؟ این عملیات قابل بازگشت نیست.")) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteProductAction(productId);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push("/admin/products");
          });
        }}
      >
        {isPending ? "در حال حذف..." : "حذف محصول"}
      </button>
      {error && <p className="text-[0.75rem] text-red-700">{error}</p>}
    </div>
  );
}
