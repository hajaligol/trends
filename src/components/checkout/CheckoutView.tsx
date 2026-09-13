"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Address } from "@/lib/db/schema";
import type { CartSummary } from "@/domains/cart/queries";
import type { ShippingMethod } from "@/domains/shipping/methods";
import { placeOrderAction } from "@/domains/orders/actions";
import { AssetSlot } from "@/components/ui/AssetSlot";
import { AddressForm } from "@/components/account/AddressForm";
import { Button } from "@/components/ui/Button";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { useCart } from "@/components/cart/CartProvider";

/**
 * The full checkout flow as one page (address → shipping method → order
 * review → place order) rather than a multi-step wizard —
 * TRENDS_PROJECT_CONTEXT.md §6 "Checkout" lists these as logical
 * sections, not necessarily separate routes/pages, and a single-page
 * checkout is a normal, well-understood pattern for a store this size.
 * Coupon application (§6 step 5) is deliberately absent — Phase 9
 * ("Promotions + payments") owns coupons; `orders.discountToman`
 * already exists in the schema so adding it later needs no migration.
 *
 * Every number shown here (subtotal, shipping fee, total) is exactly
 * what `placeOrderAction` will independently recompute server-side from
 * the live cart/address/shipping-method — this component never sends a
 * price to the server, only an `addressId` and a `shippingMethodCode`
 * (TRENDS_PROJECT_CONTEXT.md §4.3 "server is authoritative").
 */
export function CheckoutView({
  initialCart,
  initialAddresses,
  shippingMethods,
}: {
  initialCart: CartSummary;
  initialAddresses: Address[];
  shippingMethods: ShippingMethod[];
}) {
  const router = useRouter();
  const { refresh: refreshCart } = useCart();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    initialAddresses.find((address) => address.isDefault)?.id ?? initialAddresses[0]?.id ?? null,
  );
  const [showAddAddress, setShowAddAddress] = useState(initialAddresses.length === 0);
  const [shippingMethodCode, setShippingMethodCode] = useState(shippingMethods[0]?.code ?? "");
  const [customerNote, setCustomerNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // `router.refresh()` (after adding an address) re-runs the server
  // component and passes a fresh `initialAddresses` prop into this
  // already-mounted client component. Adjusting derived state during
  // render (React's documented pattern for "storing information from
  // previous renders") rather than in a `useEffect` avoids the extra
  // render pass `react-hooks/set-state-in-effect` flags — `addresses`
  // itself needs no separate state at all since it's just `initialAddresses`.
  const addresses = initialAddresses;
  const [prevAddresses, setPrevAddresses] = useState(initialAddresses);
  if (initialAddresses !== prevAddresses) {
    setPrevAddresses(initialAddresses);
    setSelectedAddressId((current) =>
      current && initialAddresses.some((address) => address.id === current)
        ? current
        : (initialAddresses.find((address) => address.isDefault)?.id ?? initialAddresses[0]?.id ?? null),
    );
    if (initialAddresses.length > 0) setShowAddAddress(false);
  }

  const cart = initialCart;
  const hasBlockingCartIssue = cart.items.some((item) => !item.isAvailable || item.isQuantityReduced);

  const selectedShippingMethod = useMemo(
    () => shippingMethods.find((method) => method.code === shippingMethodCode) ?? null,
    [shippingMethods, shippingMethodCode],
  );
  const totalToman = cart.subtotalToman + (selectedShippingMethod?.feeToman ?? 0);

  function handleAddressAdded() {
    // `createAddressAction` already revalidated `/account/addresses`'s
    // server data via `revalidatePath`; a full `router.refresh()` here
    // re-runs this Server Component page too, which is the simplest way
    // for this client view to pick up the new row without duplicating
    // `getAddressesForUser` fetching logic client-side.
    setShowAddAddress(false);
    router.refresh();
  }

  function handlePlaceOrder() {
    setError(null);
    if (!selectedAddressId) {
      setError("لطفاً یک آدرس انتخاب کنید");
      return;
    }
    if (!shippingMethodCode) {
      setError("لطفاً یک روش ارسال انتخاب کنید");
      return;
    }

    startTransition(async () => {
      const result = await placeOrderAction(selectedAddressId, shippingMethodCode, customerNote);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await refreshCart();
      router.push(`/order/${result.orderNumber}`);
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-8">
        <section>
          <h2 className="mb-4 text-[1.1rem] font-bold">آدرس ارسال</h2>
          {addresses.length > 0 && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              {addresses.map((address) => (
                <label
                  key={address.id}
                  className={`flex cursor-pointer flex-col gap-1.5 rounded-[var(--radius-lg)] border p-4 text-[0.88rem] transition-colors ${
                    selectedAddressId === address.id ? "border-ink bg-ink/[0.03]" : "border-line bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-ink">{address.recipientName}</span>
                    <input
                      type="radio"
                      name="addressId"
                      value={address.id}
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                      className="mt-0.5 h-4 w-4"
                    />
                  </div>
                  <span dir="ltr" className="text-right text-text-secondary">
                    {toPersianDigits(address.recipientMobile.replace("+98", "0"))}
                  </span>
                  <span className="text-text-secondary">
                    {address.province}، {address.city}، {address.addressLine}
                    {address.plaqueUnitDetails ? `، ${address.plaqueUnitDetails}` : ""}
                  </span>
                </label>
              ))}
            </div>
          )}

          {showAddAddress ? (
            <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
              <AddressForm onDone={handleAddressAdded} />
              {addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddAddress(false)}
                  className="mt-3 text-[0.82rem] text-text-secondary underline underline-offset-2"
                >
                  انصراف
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddAddress(true)}
              className="text-[0.85rem] font-semibold text-ink underline underline-offset-2"
            >
              + افزودن آدرس جدید
            </button>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-[1.1rem] font-bold">روش ارسال</h2>
          <div className="flex flex-col gap-3">
            {shippingMethods.map((method) => (
              <label
                key={method.code}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-lg)] border p-4 text-[0.88rem] transition-colors ${
                  shippingMethodCode === method.code ? "border-ink bg-ink/[0.03]" : "border-line bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shippingMethod"
                    value={method.code}
                    checked={shippingMethodCode === method.code}
                    onChange={() => setShippingMethodCode(method.code)}
                    className="h-4 w-4"
                  />
                  <div>
                    <p className="font-semibold text-ink">{method.label}</p>
                    <p className="text-text-secondary">{method.estimateLabel}</p>
                  </div>
                </div>
                <span className="shrink-0 font-semibold text-ink">
                  {method.feeToman === 0 ? "رایگان" : formatToman(method.feeToman)}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-[1.1rem] font-bold">یادداشت سفارش (اختیاری)</h2>
          <textarea
            value={customerNote}
            onChange={(event) => setCustomerNote(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="توضیحات یا درخواست خاصی برای سفارش خود دارید؟"
            className="w-full rounded-[var(--radius-md)] border border-line bg-white px-4 py-3 text-[0.9rem] text-ink outline-none focus:outline-2 focus:outline-ink focus:outline-offset-2"
          />
        </section>
      </div>

      <aside className="h-fit rounded-[var(--radius-lg)] border border-line bg-white p-5">
        <h2 className="mb-4 text-[1.05rem] font-bold">خلاصه سفارش</h2>

        <div className="mb-4 flex flex-col gap-3">
          {cart.items.map((item) => (
            <div key={item.itemId} className="flex items-center gap-3 text-[0.85rem]">
              <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-[8px] bg-card-image">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.imageAlt ?? item.productTitle} fill sizes="48px" className="object-cover" />
                ) : (
                  <AssetSlot label={item.productTitle} rounded="none" className="h-full w-full" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{item.productTitle}</p>
                <p className="text-text-secondary">
                  {item.size} / {item.color} × {toPersianDigits(item.requestedQuantity)}
                </p>
                {!item.isAvailable ? (
                  <p className="text-[#B0453C]">دیگر موجود نیست</p>
                ) : item.isQuantityReduced ? (
                  <p className="text-[#B0453C]">فقط {toPersianDigits(item.stock)} عدد موجود است</p>
                ) : null}
              </div>
              <span className="shrink-0 font-semibold text-ink">{formatToman(item.lineTotalToman)}</span>
            </div>
          ))}
        </div>

        {hasBlockingCartIssue && (
          <p className="mb-3 rounded-[var(--radius-sm)] bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">
            برخی کالاها دیگر موجود نیستند یا موجودی کافی ندارند.{" "}
            <Link href="/" className="underline underline-offset-2">
              بازگشت و ویرایش سبد خرید
            </Link>
          </p>
        )}

        <div className="flex flex-col gap-2 border-t border-line pt-4 text-[0.9rem]">
          <div className="flex justify-between">
            <span className="text-text-secondary">جمع کالاها</span>
            <span>{formatToman(cart.subtotalToman)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">هزینه ارسال</span>
            <span>
              {selectedShippingMethod
                ? selectedShippingMethod.feeToman === 0
                  ? "رایگان"
                  : formatToman(selectedShippingMethod.feeToman)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-[1rem] font-bold">
            <span>مبلغ قابل پرداخت</span>
            <span>{formatToman(totalToman)}</span>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-[var(--radius-sm)] bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          onClick={handlePlaceOrder}
          disabled={isPending || hasBlockingCartIssue || !selectedAddressId || !shippingMethodCode}
          className="mt-4 w-full justify-center disabled:opacity-60"
        >
          {isPending ? "در حال ثبت سفارش..." : "ثبت سفارش"}
        </Button>
        <p className="mt-3 text-center text-[0.76rem] text-text-secondary">
          درگاه پرداخت آنلاین هنوز فعال نشده است؛ سفارش شما به‌صورت «در انتظار پرداخت» ثبت می‌شود.
        </p>
      </aside>
    </div>
  );
}
