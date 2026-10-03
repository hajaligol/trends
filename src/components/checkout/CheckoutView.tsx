"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Address } from "@/lib/db/schema";
import type { CartLineItem, CartSummary } from "@/domains/cart/queries";
import type { ShippingMethod } from "@/domains/shipping/methods";
import { placeOrderAction } from "@/domains/orders/actions";
import { previewCouponAction } from "@/domains/promotions/actions";
import { AssetSlot } from "@/components/ui/AssetSlot";
import { AddressForm } from "@/components/account/AddressForm";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ArrowLeftIcon, ArrowRightIcon, BagIcon, PaymentIcon, ShippingIcon, TagIcon, TrashIcon } from "@/components/ui/icons";
import { CheckoutStepper, CHECKOUT_STEPS, type CheckoutStepKey } from "@/components/checkout/CheckoutStepper";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useToast } from "@/components/feedback/ToastProvider";
import { RemoveFromCartModal } from "@/components/checkout/RemoveFromCartModal";

const CARD = "rounded-[var(--radius-lg)] border border-line bg-white";
const INPUT =
  "w-full rounded-[var(--radius-md)] border border-line bg-white px-4 py-3 text-[0.9rem] text-ink outline-none focus:outline-2 focus:outline-ink focus:outline-offset-2";
const ERROR_TEXT = "text-[#B0453C]";

type AppliedCoupon = { code: string; discountToman: number };

/**
 * The cart + checkout as one three-stage flow: سبد خرید → ارسال → پرداخت.
 * The header's cart icon links to `/checkout`, which renders this.
 *
 * Authority: every number shown (subtotal, shipping fee, discount, total)
 * is a *preview*. `placeOrderAction` re-reads the cart, address, shipping
 * method and coupon on the server and recomputes everything; the only
 * things this component sends are an `addressId`, a `shippingMethodCode`,
 * a note and a coupon *code* (TRENDS_PROJECT_CONTEXT.md §4.3).
 *
 * Stage 1 reads the live cart from `CartProvider` (so quantity/remove
 * work in place) and falls back to the server-rendered cart until that
 * has loaded. After any cart mutation `router.refresh()` re-renders the
 * page so `shippingMethods` — whose free-shipping eligibility depends on
 * the subtotal — is recomputed by the server rather than guessed here.
 */
export function CheckoutView({
  initialCart,
  initialAddresses,
  shippingMethods,
  isAuthenticated,
}: {
  initialCart: CartSummary;
  initialAddresses: Address[];
  shippingMethods: ShippingMethod[];
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const { cart: liveCart, isLoading, isMutating, updateQuantity, removeItem, refresh: refreshCart } = useCart();
  const cart = isLoading ? initialCart : liveCart;
  const { isAuthenticated: isWishlistAuthenticated, toggle: toggleWishlist } = useWishlist();
  const { showToast } = useToast();

  // Cart line the customer asked to remove; the modal is open while set.
  const [pendingRemove, setPendingRemove] = useState<CartLineItem | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [guestWishlistNotice, setGuestWishlistNotice] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const [step, setStep] = useState<CheckoutStepKey>("cart");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    initialAddresses.find((address) => address.isDefault)?.id ?? initialAddresses[0]?.id ?? null,
  );
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [shippingMethodCode, setShippingMethodCode] = useState(shippingMethods[0]?.code ?? "");
  const [customerNote, setCustomerNote] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isCouponPending, startCouponTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // After `router.refresh()` (new address, or recomputed shipping methods)
  // this already-mounted component receives fresh props. Adjusting state
  // during render is React's documented pattern for that, and avoids the
  // extra render pass an effect would cause.
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
  const [prevMethods, setPrevMethods] = useState(shippingMethods);
  if (shippingMethods !== prevMethods) {
    setPrevMethods(shippingMethods);
    if (!shippingMethods.some((method) => method.code === shippingMethodCode)) {
      setShippingMethodCode(shippingMethods[0]?.code ?? "");
    }
  }

  // Move focus to the stage heading when the stage changes, so keyboard
  // and screen-reader users land at the top of the new content. Skipped
  // on first render (don't steal focus on page load).
  useEffect(() => {
    if (!hasNavigated.current) return;
    headingRef.current?.focus();
  }, [step]);

  const hasItems = cart.items.length > 0;
  const hasBlockingCartIssue = cart.items.some((item) => !item.isAvailable || item.isQuantityReduced);
  const addresses = initialAddresses;
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? null;
  const selectedShippingMethod = useMemo(
    () => shippingMethods.find((method) => method.code === shippingMethodCode) ?? null,
    [shippingMethods, shippingMethodCode],
  );
  const discountToman = appliedCoupon?.discountToman ?? 0;
  const shippingFeeToman = step === "cart" ? 0 : (selectedShippingMethod?.feeToman ?? 0);
  const totalToman = Math.max(0, cart.subtotalToman + shippingFeeToman - discountToman);
  const itemUnits = cart.items.reduce((sum, item) => sum + item.requestedQuantity, 0);
  const stepIndex = CHECKOUT_STEPS.findIndex((entry) => entry.key === step);

  function goTo(next: CheckoutStepKey) {
    hasNavigated.current = true;
    setError(null);
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Re-checks an applied coupon against the (changed) cart. The preview is
   * advisory; the server re-validates at checkout regardless. */
  function revalidateCoupon() {
    if (!appliedCoupon) return;
    const code = appliedCoupon.code;
    startCouponTransition(async () => {
      const result = await previewCouponAction(code);
      if (result.ok) {
        setAppliedCoupon({ code: result.code, discountToman: result.discountToman });
      } else {
        setAppliedCoupon(null);
        setCouponError(`کد «${code}» دیگر برای این سبد معتبر نیست: ${result.error}`);
      }
    });
  }

  function afterCartChange(ok: boolean) {
    if (!ok) return;
    router.refresh();
    revalidateCoupon();
  }

  function openRemoveModal(item: CartLineItem) {
    setRemoveError(null);
    setGuestWishlistNotice(false);
    setPendingRemove(item);
  }

  function closeRemoveModal() {
    if (isRemoving) return;
    setPendingRemove(null);
  }

  async function confirmRemove() {
    if (!pendingRemove) return;
    setIsRemoving(true);
    setRemoveError(null);
    const ok = await removeItem(pendingRemove.itemId);
    setIsRemoving(false);
    if (!ok) {
      setRemoveError("حذف کالا ممکن نشد. لطفاً دوباره تلاش کنید.");
      return;
    }
    setPendingRemove(null);
    afterCartChange(true);
  }

  /** "Move to wishlist": save the product first, and only then remove the
   * cart line — if the wishlist write fails the item stays in the cart. */
  async function moveToWishlist() {
    if (!pendingRemove) return;
    if (!isWishlistAuthenticated) {
      setGuestWishlistNotice(true);
      return;
    }
    setIsRemoving(true);
    setRemoveError(null);
    const saved = await toggleWishlist(pendingRemove.productId, true);
    if (!saved) {
      setIsRemoving(false);
      setRemoveError("افزودن به علاقه‌مندی‌ها ممکن نشد. لطفاً دوباره تلاش کنید.");
      return;
    }
    const removed = await removeItem(pendingRemove.itemId);
    setIsRemoving(false);
    if (!removed) {
      setRemoveError("کالا به علاقه‌مندی‌ها اضافه شد، اما از سبد خرید حذف نشد.");
      return;
    }
    setPendingRemove(null);
    showToast("کالا به علاقه‌مندی‌ها منتقل شد");
    afterCartChange(true);
  }

  function handleApplyCoupon() {
    setCouponError(null);
    const code = couponInput.trim();
    if (!code) {
      setCouponError("کد تخفیف را وارد کنید");
      return;
    }
    startCouponTransition(async () => {
      const result = await previewCouponAction(code);
      if (!result.ok) {
        setAppliedCoupon(null);
        setCouponError(result.error);
        return;
      }
      setAppliedCoupon({ code: result.code, discountToman: result.discountToman });
      setCouponInput("");
    });
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  function handleAddressAdded() {
    setShowAddAddress(false);
    router.refresh();
  }

  function handlePlaceOrder() {
    setError(null);
    if (!selectedAddressId) {
      goTo("shipping");
      setError("لطفاً یک آدرس انتخاب کنید");
      return;
    }
    if (!shippingMethodCode) {
      goTo("shipping");
      setError("لطفاً یک روش ارسال انتخاب کنید");
      return;
    }

    startTransition(async () => {
      const result = await placeOrderAction(
        selectedAddressId,
        shippingMethodCode,
        customerNote,
        appliedCoupon?.code ?? null,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await refreshCart();
      // A configured provider (mock, or a real gateway later) hands back
      // a `redirectUrl` — send the browser there, not to the confirmation
      // page, since payment hasn't been verified yet. Only when no
      // provider is configured (`redirectUrl: null`) does the customer
      // go straight to the confirmation page, still `pending_payment`.
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      router.push(`/order/${result.orderNumber}`);
    });
  }

  return (
    <div>
      <RemoveFromCartModal
        item={pendingRemove}
        busy={isRemoving}
        error={removeError}
        isAuthenticated={isWishlistAuthenticated}
        guestNotice={guestWishlistNotice}
        onClose={closeRemoveModal}
        onRemove={confirmRemove}
        onMoveToWishlist={moveToWishlist}
      />
      <CheckoutStepper current={step} onNavigate={goTo} />

      <h1 ref={headingRef} tabIndex={-1} className="mb-6 text-[1.4rem] font-bold outline-none sm:text-[1.6rem]">
        {step === "cart" ? "سبد خرید شما" : step === "shipping" ? "اطلاعات ارسال" : "پرداخت"}
        <span className="sr-only">
          {" "}
          — مرحله {toPersianDigits(stepIndex + 1)} از {toPersianDigits(CHECKOUT_STEPS.length)}
        </span>
      </h1>

      {step === "cart" && !hasItems ? (
        <EmptyCart />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-6">
            {step === "cart" && (
              <>
                <section aria-label="کالاهای سبد خرید" className="flex flex-col gap-3">
                  {cart.items.map((item) => (
                    <CartLine
                      key={item.itemId}
                      item={item}
                      busy={isMutating}
                      onQuantity={async (quantity) => afterCartChange(await updateQuantity(item.itemId, quantity))}
                      onRemove={() => openRemoveModal(item)}
                    />
                  ))}
                </section>

                <section className={`${CARD} p-5`}>
                  <h2 className="mb-3 flex items-center gap-2 text-[1rem] font-bold">
                    <TagIcon className="h-5 w-5" />
                    کد تخفیف
                  </h2>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-sage/40 px-4 py-3 text-[0.88rem]">
                      <div>
                        <p className="m-0 font-semibold text-ink" dir="ltr">
                          {appliedCoupon.code}
                        </p>
                        <p className="m-0 text-text-secondary">{formatToman(appliedCoupon.discountToman)} تخفیف اعمال شد</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="cursor-pointer border-0 bg-transparent p-0 text-[0.82rem] text-text-secondary underline underline-offset-2"
                      >
                        حذف
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <label className="sr-only" htmlFor="coupon-code">
                        کد تخفیف
                      </label>
                      <input
                        id="coupon-code"
                        type="text"
                        value={couponInput}
                        onChange={(event) => setCouponInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                        placeholder="کد تخفیف را وارد کنید"
                        dir="ltr"
                        autoComplete="off"
                        className={`${INPUT} min-w-0 flex-1 py-2.5`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleApplyCoupon}
                        disabled={isCouponPending}
                        className="shrink-0 disabled:opacity-60"
                      >
                        {isCouponPending ? "در حال بررسی…" : "اعمال کد"}
                      </Button>
                    </div>
                  )}
                  {couponError && (
                    <p role="alert" className={`mt-2 mb-0 text-[0.82rem] ${ERROR_TEXT}`}>
                      {couponError}
                    </p>
                  )}
                </section>

                <div>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-[0.88rem] text-text-secondary underline-offset-2 hover:text-ink hover:underline"
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                    ادامه خرید
                  </Link>
                </div>
              </>
            )}

            {step === "shipping" && (
              <>
                {!isAuthenticated ? (
                  <LoginGate />
                ) : (
                  <>
                    <section className={`${CARD} p-5 sm:p-6`}>
                      <h2 className="mb-4 flex items-center gap-2 text-[1.05rem] font-bold">
                        <ShippingIcon stroke="currentColor" className="h-6 w-6" aria-hidden="true" />
                        آدرس تحویل
                      </h2>
                      {addresses.length > 0 && (
                        <fieldset className="m-0 mb-4 grid min-w-0 gap-3 border-0 p-0 sm:grid-cols-2">
                          <legend className="sr-only">انتخاب آدرس</legend>
                          {addresses.map((address) => (
                            <ChoiceCard key={address.id} selected={selectedAddressId === address.id}>
                              <input
                                type="radio"
                                name="addressId"
                                value={address.id}
                                checked={selectedAddressId === address.id}
                                onChange={() => setSelectedAddressId(address.id)}
                                className="sr-only"
                              />
                              <span className="font-semibold text-ink">{address.recipientName}</span>
                              <span dir="ltr" className="text-right text-text-secondary">
                                {toPersianDigits(address.recipientMobile.replace("+98", "0"))}
                              </span>
                              <span className="text-text-secondary">
                                {address.province}، {address.city}، {address.addressLine}
                                {address.plaqueUnitDetails ? `، ${address.plaqueUnitDetails}` : ""}
                              </span>
                            </ChoiceCard>
                          ))}
                        </fieldset>
                      )}

                      {showAddAddress || addresses.length === 0 ? (
                        <div className="rounded-[var(--radius-md)] border border-line bg-bg p-4 sm:p-5">
                          <AddressForm
                            onDone={handleAddressAdded}
                            onCancel={addresses.length > 0 ? () => setShowAddAddress(false) : undefined}
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowAddAddress(true)}
                          className="cursor-pointer border-0 bg-transparent p-0 text-[0.88rem] font-semibold text-ink underline underline-offset-2"
                        >
                          + افزودن آدرس جدید
                        </button>
                      )}
                    </section>

                    <section className={`${CARD} p-5 sm:p-6`}>
                      <h2 className="mb-4 text-[1.05rem] font-bold">روش ارسال</h2>
                      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
                        <legend className="sr-only">انتخاب روش ارسال</legend>
                        {shippingMethods.map((method) => (
                          <ChoiceCard key={method.code} selected={shippingMethodCode === method.code} row>
                            <input
                              type="radio"
                              name="shippingMethod"
                              value={method.code}
                              checked={shippingMethodCode === method.code}
                              onChange={() => setShippingMethodCode(method.code)}
                              className="sr-only"
                            />
                            <span className="flex flex-col gap-0.5">
                              <span className="font-semibold text-ink">{method.label}</span>
                              <span className="text-text-secondary">{method.estimateLabel}</span>
                            </span>
                            <span className="shrink-0 font-semibold text-ink">
                              {method.feeToman === 0 ? "رایگان" : formatToman(method.feeToman)}
                            </span>
                          </ChoiceCard>
                        ))}
                      </fieldset>
                    </section>

                    <section className={`${CARD} p-5 sm:p-6`}>
                      <h2 className="mb-3 text-[1.05rem] font-bold">
                        <label htmlFor="customer-note">یادداشت سفارش (اختیاری)</label>
                      </h2>
                      <textarea
                        id="customer-note"
                        value={customerNote}
                        onChange={(event) => setCustomerNote(event.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="توضیحات یا درخواست خاصی برای سفارش خود دارید؟"
                        className={INPUT}
                      />
                    </section>
                  </>
                )}

                <div>
                  <BackButton onClick={() => goTo("cart")}>بازگشت به سبد خرید</BackButton>
                </div>
              </>
            )}

            {step === "payment" && (
              <>
                <section className={`${CARD} p-5 sm:p-6`}>
                  <h2 className="mb-4 text-[1.05rem] font-bold">بازبینی سفارش</h2>
                  <dl className="m-0 flex flex-col gap-4 text-[0.88rem]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <dt className="mb-1 text-text-secondary">تحویل به</dt>
                        <dd className="m-0 text-ink">
                          {selectedAddress ? (
                            <>
                              <span className="font-semibold">{selectedAddress.recipientName}</span>
                              <span className="text-text-secondary">
                                {" — "}
                                {selectedAddress.province}، {selectedAddress.city}، {selectedAddress.addressLine}
                                {selectedAddress.plaqueUnitDetails ? `، ${selectedAddress.plaqueUnitDetails}` : ""}
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>
                      <EditLink onClick={() => goTo("shipping")} label="ویرایش آدرس" />
                    </div>
                    <div className="flex items-start justify-between gap-4 border-t border-line pt-4">
                      <div>
                        <dt className="mb-1 text-text-secondary">روش ارسال</dt>
                        <dd className="m-0 text-ink">
                          {selectedShippingMethod ? (
                            <>
                              <span className="font-semibold">{selectedShippingMethod.label}</span>
                              <span className="text-text-secondary"> — {selectedShippingMethod.estimateLabel}</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>
                      <EditLink onClick={() => goTo("shipping")} label="ویرایش روش ارسال" />
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
                      <div className="min-w-0">
                        <dt className="mb-2 text-text-secondary">کالاها ({toPersianDigits(itemUnits)} عدد)</dt>
                        <dd className="m-0 flex flex-wrap gap-2">
                          {cart.items.map((item) => (
                            <Thumb key={item.itemId} item={item} size={48} />
                          ))}
                        </dd>
                      </div>
                      <EditLink onClick={() => goTo("cart")} label="ویرایش سبد خرید" />
                    </div>
                  </dl>
                </section>

                <section className={`${CARD} p-5 sm:p-6`}>
                  <h2 className="mb-4 flex items-center gap-2 text-[1.05rem] font-bold">
                    <PaymentIcon stroke="currentColor" className="h-6 w-6" aria-hidden="true" />
                    روش پرداخت
                  </h2>
                  <div className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-ink bg-ink/[0.03] p-4 text-[0.88rem]">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-ink">پرداخت اینترنتی</span>
                      <span className="text-text-secondary">پرداخت امن با کارت‌های عضو شتاب از طریق درگاه بانکی</span>
                    </div>
                    <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border-[5px] border-ink bg-white" />
                  </div>
                  <p className="mt-3 mb-0 text-[0.78rem] leading-relaxed text-text-secondary">
                    اطلاعات کارت شما در فروشگاه ذخیره نمی‌شود. پس از ثبت سفارش به صفحه درگاه پرداخت منتقل می‌شوید. اگر
                    درگاه پرداخت آنلاین هنوز فعال نباشد، سفارش شما به‌صورت «در انتظار پرداخت» ثبت می‌شود.
                  </p>
                </section>

                <div>
                  <BackButton onClick={() => goTo("shipping")}>بازگشت به ارسال</BackButton>
                </div>
              </>
            )}
          </div>

          <aside aria-label="خلاصه سفارش" className={`${CARD} p-5 sm:p-6 lg:sticky lg:top-6`}>
            <h2 className="mb-4 text-[1.05rem] font-bold">خلاصه سفارش</h2>

            {step !== "cart" && (
              <ul className="mb-4 flex list-none flex-col gap-3 p-0">
                {cart.items.map((item) => (
                  <li key={item.itemId} className="flex items-center gap-3 text-[0.82rem]">
                    <Thumb item={item} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate font-semibold text-ink">{item.productTitle}</p>
                      <p className="m-0 text-text-secondary">
                        {toPersianDigits(item.size)} / {item.color} × {toPersianDigits(item.requestedQuantity)}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-ink">{formatToman(item.lineTotalToman)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className={`flex flex-col gap-2.5 text-[0.9rem] ${step !== "cart" ? "border-t border-line pt-4" : ""}`}>
              <div className="flex justify-between">
                <span className="text-text-secondary">جمع کالاها ({toPersianDigits(itemUnits)})</span>
                <span>{formatToman(cart.subtotalToman)}</span>
              </div>
              {discountToman > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">تخفیف</span>
                  <span>−{formatToman(discountToman)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">هزینه ارسال</span>
                <span className={step === "cart" ? "text-[0.8rem] text-text-secondary" : ""}>
                  {step === "cart"
                    ? "در مرحله بعد"
                    : selectedShippingMethod
                      ? selectedShippingMethod.feeToman === 0
                        ? "رایگان"
                        : formatToman(selectedShippingMethod.feeToman)
                      : "—"}
                </span>
              </div>
              <div className="mt-1 flex justify-between border-t border-line pt-3 text-[1.02rem] font-bold">
                <span>{step === "cart" ? "جمع کل" : "مبلغ قابل پرداخت"}</span>
                <span>{formatToman(totalToman)}</span>
              </div>
            </div>

            {hasBlockingCartIssue && step === "cart" && (
              <p role="alert" className={`mt-4 mb-0 rounded-[var(--radius-sm)] bg-red-50 px-3 py-2 text-[0.8rem] ${ERROR_TEXT}`}>
                برخی کالاها دیگر موجود نیستند یا موجودی کافی ندارند. لطفاً آن‌ها را اصلاح یا حذف کنید.
              </p>
            )}

            {error ? (
              <p role="alert" className={`mt-4 mb-0 rounded-[var(--radius-sm)] bg-red-50 px-3 py-2 text-[0.8rem] ${ERROR_TEXT}`}>
                {error}
              </p>
            ) : null}

            {step === "cart" && (
              <Button
                type="button"
                variant="brand"
                disabled={!hasItems || hasBlockingCartIssue || isMutating}
                onClick={() => goTo("shipping")}
                className="mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                ادامه به ارسال
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
            )}
            {step === "shipping" && isAuthenticated && (
              <Button
                type="button"
                variant="brand"
                disabled={!selectedAddressId || !shippingMethodCode}
                onClick={() => goTo("payment")}
                className="mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                ادامه به پرداخت
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
            )}
            {step === "payment" && (
              <Button
                type="button"
                variant="brand"
                onClick={handlePlaceOrder}
                disabled={isPending || hasBlockingCartIssue || !selectedAddressId || !shippingMethodCode}
                className="mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "در حال ثبت سفارش…" : "ثبت سفارش و پرداخت"}
              </Button>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function EmptyCart() {
  return (
    <div className={`${CARD} flex flex-col items-center gap-4 px-6 py-14 text-center`}>
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-hero-beige text-ink">
        <BagIcon className="h-9 w-9" strokeWidth={1.2} />
      </span>
      <h2 className="m-0 text-[1.15rem] font-bold">سبد خرید شما خالی است</h2>
      <p className="m-0 max-w-[360px] text-[0.9rem] text-text-secondary">
        هنوز کالایی به سبد خرید اضافه نکرده‌اید. از میان محصولات، چیزی که دوست دارید پیدا کنید.
      </p>
      <Link href="/" className={buttonClasses("brand")}>
        شروع خرید
      </Link>
    </div>
  );
}

function LoginGate() {
  return (
    <section className={`${CARD} flex flex-col items-center gap-4 px-6 py-12 text-center`}>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-lavender text-ink">
        <ShippingIcon stroke="currentColor" className="h-8 w-8" aria-hidden="true" />
      </span>
      <h2 className="m-0 text-[1.1rem] font-bold">برای ادامه وارد حساب کاربری شوید</h2>
      <p className="m-0 max-w-[380px] text-[0.88rem] text-text-secondary">
        برای ثبت آدرس و سفارش به حساب کاربری نیاز دارید. سبد خرید شما پس از ورود یا ثبت‌نام حفظ می‌شود.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/login" className={buttonClasses("brand")}>
          ورود
        </Link>
        <Link href="/register" className={buttonClasses("outline")}>
          ثبت‌نام
        </Link>
      </div>
    </section>
  );
}

function Thumb({ item, size }: { item: CartLineItem; size: number }) {
  return (
    <span
      style={{ width: size, height: Math.round(size * 1.2) }}
      className="relative block shrink-0 overflow-hidden rounded-[8px] bg-card-image"
    >
      {item.imageUrl ? (
        <Image src={item.imageUrl} alt={item.imageAlt ?? item.productTitle} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <AssetSlot label={item.productTitle} rounded="none" className="h-full w-full" />
      )}
    </span>
  );
}

function CartLine({
  item,
  busy,
  onQuantity,
  onRemove,
}: {
  item: CartLineItem;
  busy: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const hasDiscount = item.compareAtPriceToman !== null && item.compareAtPriceToman > item.unitPriceToman;
  return (
    <article className={`${CARD} flex gap-4 p-4 sm:gap-5 sm:p-5`}>
      <Link href={`/product/${item.productSlug}`} className="shrink-0" aria-label={item.productTitle}>
        <span className="relative block h-[112px] w-[92px] overflow-hidden rounded-[var(--radius-md)] bg-card-image sm:h-[132px] sm:w-[108px]">
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt={item.imageAlt ?? item.productTitle} fill sizes="108px" className="object-cover" />
          ) : (
            <AssetSlot label={item.productTitle} rounded="none" className="h-full w-full" />
          )}
        </span>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/product/${item.productSlug}`} className="block truncate text-[0.98rem] font-semibold text-ink hover:underline">
              {item.productTitle}
            </Link>
            <dl className="m-0 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.82rem] text-text-secondary">
              <div className="flex items-center gap-1.5">
                <dt>سایز:</dt>
                <dd className="m-0 font-medium text-ink">{toPersianDigits(item.size)}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt>رنگ:</dt>
                <dd className="m-0 flex items-center gap-1.5 font-medium text-ink">
                  {item.colorHex && (
                    <span
                      aria-hidden="true"
                      style={{ backgroundColor: item.colorHex }}
                      className="h-3.5 w-3.5 rounded-full border border-ink/15"
                    />
                  )}
                  {item.color}
                </dd>
              </div>
            </dl>
          </div>
          <button
            type="button"
            aria-label={`حذف «${item.productTitle}» از سبد خرید`}
            disabled={busy}
            onClick={onRemove}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#E0483C] transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <TrashIcon className="h-[20px] w-[20px]" />
          </button>
        </div>

        {!item.isAvailable ? (
          <p role="alert" className={`m-0 text-[0.84rem] ${ERROR_TEXT}`}>
            این کالا دیگر موجود نیست؛ لطفاً آن را حذف کنید.
          </p>
        ) : (
          <>
            {item.isQuantityReduced && (
              <p role="alert" className={`m-0 text-[0.82rem] ${ERROR_TEXT}`}>
                فقط {toPersianDigits(item.stock)} عدد موجود است.{" "}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onQuantity(item.stock)}
                  className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-inherit underline underline-offset-2 disabled:opacity-50"
                >
                  تنظیم به {toPersianDigits(item.stock)} عدد
                </button>
              </p>
            )}
            <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
              <div className="inline-flex items-center rounded-full border border-line bg-bg">
                <button
                  type="button"
                  aria-label="کاهش تعداد"
                  disabled={busy}
                  onClick={() => onQuantity(item.requestedQuantity - 1)}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[1.1rem] text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <span aria-live="polite" className="min-w-8 text-center text-[0.95rem] font-semibold">
                  {toPersianDigits(item.requestedQuantity)}
                </span>
                <button
                  type="button"
                  aria-label="افزایش تعداد"
                  disabled={busy || item.requestedQuantity >= item.stock}
                  onClick={() => onQuantity(item.requestedQuantity + 1)}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[1.1rem] text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>

              <div className="flex flex-col items-end gap-0.5 text-end">
                <span className="text-[0.78rem] text-text-secondary">
                  قیمت واحد: {formatToman(item.unitPriceToman)}
                  {hasDiscount && item.compareAtPriceToman !== null && (
                    <span className="ms-2 line-through">{formatToman(item.compareAtPriceToman)}</span>
                  )}
                </span>
                <span className="text-[1.02rem] font-bold text-ink">{formatToman(item.lineTotalToman)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

/** Radio card: the native input is visually hidden but stays focusable and
 * keyboard-operable; `has-[:focus-visible]` draws the focus ring on the card. */
function ChoiceCard({ selected, row = false, children }: { selected: boolean; row?: boolean; children: ReactNode }) {
  return (
    <label
      className={`flex cursor-pointer gap-1.5 rounded-[var(--radius-lg)] border p-4 text-[0.88rem] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
        row ? "items-center justify-between gap-3" : "flex-col"
      } ${selected ? "border-ink bg-ink/[0.03]" : "border-line bg-white hover:border-ink/30"}`}
    >
      {children}
    </label>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-[0.88rem] text-text-secondary underline-offset-2 hover:text-ink hover:underline"
    >
      <ArrowRightIcon className="h-4 w-4" />
      {children}
    </button>
  );
}

function EditLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-[0.82rem] font-semibold text-ink underline underline-offset-2"
    >
      ویرایش
    </button>
  );
}
