import { memo, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Check, Lock, MapPin, MapPinOff, Plus, Wallet, Truck, ShieldCheck, ChevronLeft, Coins } from 'lucide-react';
import StoreShell, { primaryBtnCls, ghostBtnCls, BtnSweep, cardCls } from '../../components/store/StoreShell';
import AddressForm from '../../components/store/AddressForm';
import { TotalsRows, FreeDeliveryBar } from '../../components/store/BagSummary';
import CouponBox from '../../components/store/checkout/CouponBox';
import useCoupon, { forgetCoupon } from '../../components/store/checkout/useCoupon';
import CreditsToggle from '../../components/store/checkout/CreditsToggle';
import useCredits from '../../components/store/checkout/useCredits';
import usePincode, { etaDate } from '../../components/store/checkout/usePincode';
import Seo from '../../components/Seo';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { addressLine } from '../../utils/address';
import { PAYMENT_OPTIONS } from '../../utils/payments';
import usePlaceOrder from '../../hooks/usePlaceOrder';
import { useBagLines } from '../../store/bag';
import { clearCart } from '../../store/cart';
import { loadCatalog } from '../../store/catalog';
import { formatPrice } from '../../store/catalogConfig';
import { SETTINGS } from '../../store/settings';

// Checkout (/checkout): 1 · delivery address (pick a saved one or add one
// inline) → 2 · payment method → place order. Razorpay / COD go through
// the shared usePlaceOrder hook (server re-validates prices + stock and
// computes the real total). On success the bag is cleared and we go to
// /order/:id/success. The summary has a coupon box (the server re-checks
// the code and computes the discounted total); the chosen address's pincode
// is checked for delivery + COD, and paying is blocked where we don't deliver.
// Signed-in customers with ZUNUZ Credits get a "Use ZUNUZ Credits" switch
// (credits OR a coupon, never both); credits can cover the whole order incl.
// delivery, in which case there's no payment step at all.
export default memo(CheckoutPage);

const PAY_ICONS = { RAZORPAY: Wallet, COD: Truck };

function Step({ n, title, done, children, action }) {
  return (
    <section className={`co-in p-[clamp(18px,2.4vw,28px)] ${cardCls}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="m-0 flex items-center gap-3 text-[length:clamp(19px,2vw,22px)] font-bold">
          <span className={`flex size-8 items-center justify-center rounded-full text-[15px] transition-colors duration-300 ${done ? 'bg-[#1E8A4C] text-white' : 'bg-[#111110] text-white'}`}>
            {done ? <Check size={17} strokeWidth={3} /> : n}
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// Delivery check for the selected address.
function PincodeNotice({ pin, pincode }) {
  if (pin.status === 'loading') {
    return (
      <p className="m-0 mt-3 flex items-center gap-2 font-['Inter',sans-serif] text-[13px] text-[#111110]/55">
        <span className="size-3.5 animate-spin rounded-full border-2 border-[#111110]/15 border-t-[#FF3D8B]" /> Checking delivery to {pincode}…
      </p>
    );
  }
  if (pin.status !== 'ready' || !pin.info) return null;
  const i = pin.info;
  if (!i.serviceable) {
    return (
      <div role="alert" className="mt-3 flex items-start gap-3 rounded-[16px] bg-[#FFE0EA] px-4 py-3 font-['Inter',sans-serif] text-[14px] text-[#B4123E]">
        <MapPinOff size={18} className="mt-0.5 shrink-0" />
        <span><b>We don't deliver to {i.pincode} yet.</b> Pick another address or add a new one to continue.</span>
      </div>
    );
  }
  const by = etaDate(i.etaDays);
  return (
    <p className="m-0 mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[14px] bg-[#E8F7EE] px-3.5 py-2.5 font-['Inter',sans-serif] text-[13px] font-semibold text-[#1E8A4C]">
      <Truck size={16} className="shrink-0" />
      {i.etaDays
        ? <>Delivers to {i.pincode} in {i.etaDays}{by && <span className="font-normal">· by {by}</span>}</>
        : <>We deliver to {i.pincode} · 2–7 business days</>}
    </p>
  );
}

function CheckoutPage() {
  const { customer, loading: authLoading } = useAuth();
  const bag = useBagLines();
  const { placing, orderError, setOrderError, placedOrder, placeOrder } = usePlaceOrder(customer);
  const rootRef = useRef(null);

  const [addresses, setAddresses] = useState(null); // null = loading
  const [addrId, setAddrId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [pay, setPay] = useState(PAYMENT_OPTIONS[0]?.id || 'RAZORPAY');

  useEffect(() => { loadCatalog(true); }, []); // fresh prices + stock before paying

  const coupon = useCoupon(bag.itemsTotal, bag.ready && bag.buyable.length > 0);
  const credits = useCredits(customer);
  const [creditsOn, setCreditsOn] = useState(false);

  useEffect(() => {
    if (!customer) return undefined;
    let alive = true;
    api.get('/customers/addresses')
      .then((list) => {
        if (!alive) return;
        setAddresses(list);
        setAddrId((cur) => cur ?? (list.find((a) => a.isDefault) || list[0])?.id ?? null);
        setAdding(list.length === 0);
      })
      .catch(() => { if (alive) { setAddresses([]); setAdding(true); } });
    return () => { alive = false; };
  }, [customer]);

  // Entrance.
  const showForm = !!customer && bag.buyable.length > 0;
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const tl = gsap.fromTo(root.querySelectorAll('.co-in'), { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' });
    return () => tl.kill();
  }, [showForm]);

  // Paid / placed → empty the bag (the order owns those items now).
  useEffect(() => { if (placedOrder) { clearCart(); forgetCoupon(); } }, [placedOrder]);

  const address = addresses?.find((a) => a.id === addrId) || null;
  const pin = usePincode(address?.pincode);
  const pinInfo = pin.status === 'ready' ? pin.info : null;
  const notServiceable = !!pinInfo && !pinInfo.serviceable;
  const codBlocked = !!pinInfo && !pinInfo.codAvailable;
  const payOptions = PAYMENT_OPTIONS.map((o) => ({ ...o, blocked: o.id === 'COD' && codBlocked }));
  // COD not available for this pincode → fall back to online payment.
  const method = payOptions.find((o) => o.id === pay && !o.blocked)?.id || payOptions.find((o) => !o.blocked)?.id || null;

  if (placedOrder) return <Navigate to={`/order/${placedOrder.id}/success`} replace state={{ order: placedOrder }} />;

  // One offer per order: the Navratri combo, a coupon or ZUNUZ Credits.
  // With the combo applied, a coupon is set aside and credits are off.
  const comboOn = (bag.bundleDiscount || 0) > 0;
  const couponApplied = comboOn ? null : coupon.applied;
  const discount = couponApplied ? coupon.discount : 0;
  const itemsBase = bag.discountedItemsTotal ?? bag.itemsTotal;
  // Credits can't be combined with a coupon (or the combo); they can pay items + delivery.
  const useCreditsNow = creditsOn && !couponApplied && !comboOn && credits.balance > 0;
  const creditsApplied = useCreditsNow ? Math.min(credits.balance, itemsBase + bag.deliveryFee) : 0;
  const total = Math.max(0, Math.max(0, itemsBase - discount) + bag.deliveryFee - creditsApplied);
  const paidByCredits = creditsApplied > 0 && total === 0;

  const submit = () => {
    if (!address) { setOrderError('Add or pick a delivery address first.'); return; }
    if (notServiceable) { setOrderError(`We don't deliver to ${address.pincode} yet — pick or add another address.`); return; }
    if (!method && !paidByCredits) { setOrderError('No payment method is available for this address.'); return; }
    if (!bag.buyable.length || coupon.busy) return;
    placeOrder({
      addressId: address.id,
      items: bag.buyable.map((l) => ({ productId: Number(l.item.id), quantity: l.qty })),
      // Fully covered by credits → the server places it as 'CREDITS'.
      paymentMethod: method || PAYMENT_OPTIONS[0]?.id || 'RAZORPAY',
      couponCode: useCreditsNow || comboOn ? undefined : couponApplied?.code,
      useCredits: useCreditsNow,
    });
  };

  const canPay = !!customer && bag.buyable.length > 0 && bag.ready;
  const payLabel = paidByCredits ? 'Place order (paid with credits)' : method === 'COD' ? 'Place order' : `Pay ${formatPrice(total)}`;
  const checkoutPaused = !!SETTINGS.checkoutPaused; // Admin → Settings → Pause checkout
  const payDisabled = checkoutPaused || placing || adding || !address || notServiceable || (!method && !paidByCredits) || pin.status === 'loading' || coupon.busy;
  const payInner = placing
    ? <><span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Processing…</>
    : <><Lock size={17} /> {payLabel}</>;

  let body;
  if (authLoading || (!bag.ready && bag.lines.length)) {
    body = <div className="flex justify-center py-24"><span aria-label="Loading" className="size-10 animate-spin rounded-full border-[3px] border-[#111110]/10 border-t-[#FF3D8B]" /></div>;
  } else if (!bag.buyable.length) {
    return <Navigate to="/cart" replace />;
  } else if (!customer) {
    body = (
      <div className={`co-in mx-auto mt-6 flex max-w-[480px] flex-col items-center px-6 py-10 text-center ${cardCls}`}>
        <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-[#FFE0EA] text-[#FF3D8B]"><Lock size={26} /></span>
        <h2 className="m-0 mt-4 text-[28px] font-bold">Log in to check out</h2>
        <p className="m-0 mt-2 font-['Inter',sans-serif] text-[15px] text-[#111110]/65">So we can save your address and you can track the order. Your bag stays just as it is.</p>
        <div className="mt-6 flex w-full flex-col gap-3">
          <Link to="/login" state={{ returnTo: '/checkout' }} className={`${primaryBtnCls} w-full`}><BtnSweep />Log in</Link>
          <Link to="/signup" state={{ returnTo: '/checkout' }} className={`${ghostBtnCls} w-full`}>Create an account</Link>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="mt-7 grid grid-cols-[minmax(0,1fr)_minmax(300px,390px)] items-start gap-[clamp(20px,3vw,40px)] max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-4">
          <Step
            n={1}
            title="Delivery address"
            done={!!address && !adding}
            action={addresses?.length > 0 && !adding && (
              <button type="button" onClick={() => setAdding(true)} className="flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border-0 bg-transparent font-['Inter',sans-serif] text-[14px] font-bold text-[#1A6FE8] hover:underline">
                <Plus size={16} /> Add new
              </button>
            )}
          >
            {addresses === null ? (
              <div className="h-20 animate-pulse rounded-[16px] bg-[#EFE8DA]" />
            ) : adding ? (
              <AddressForm
                customer={customer}
                makeDefault={addresses.length === 0}
                submitLabel="Deliver here"
                onCancel={addresses.length ? () => setAdding(false) : undefined}
                onSaved={(a) => {
                  setAddresses((list) => [a, ...(a.isDefault ? list.map((x) => ({ ...x, isDefault: false })) : list)]);
                  setAddrId(a.id);
                  setAdding(false);
                  setOrderError('');
                }}
              />
            ) : (
              <ul role="radiogroup" aria-label="Saved addresses" className="m-0 flex list-none flex-col gap-2.5 p-0">
                {addresses.map((a) => {
                  const on = a.id === addrId;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => { setAddrId(a.id); setOrderError(''); }}
                        className={`flex w-full cursor-pointer items-start gap-3 rounded-[18px] border-2 p-4 text-left transition-[border-color,background-color] duration-300 ${on ? 'border-[#FF3D8B] bg-[#FFF3F7]' : 'border-[#111110]/10 bg-white hover:border-[#111110]/30'}`}
                      >
                        <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${on ? 'border-[#FF3D8B]' : 'border-[#111110]/25'}`}>
                          <span className={`size-2.5 rounded-full bg-[#FF3D8B] transition-transform duration-300 ${on ? 'scale-100' : 'scale-0'}`} />
                        </span>
                        <span className="min-w-0 font-['Inter',sans-serif]">
                          <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                            {a.name}
                            <span className="rounded-full bg-[#111110]/6 px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase text-[#111110]/65">{a.label}</span>
                            {a.isDefault && <span className="rounded-full bg-[#E8F7EE] px-2 py-0.5 text-[11px] font-bold text-[#1E8A4C]">Default</span>}
                          </span>
                          <span className="mt-1 block text-[14px] leading-snug text-[#111110]/70">{addressLine(a)}</span>
                          <span className="mt-1 block text-[13px] text-[#111110]/55">+91 {a.phone}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {!adding && address && <PincodeNotice pin={pin} pincode={address.pincode} />}
          </Step>

          <Step n={2} title="Payment" done={paidByCredits}>
            {paidByCredits ? (
              <p className="m-0 flex items-center gap-3 rounded-[18px] bg-[#E8F7EE] px-4 py-3.5 font-['Inter',sans-serif] text-[14px] text-[#1E6B3E]">
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1E8A4C] text-white"><Coins size={19} /></span>
                <span><b>Your ZUNUZ Credits cover this order.</b> Nothing more to pay — just place it.</span>
              </p>
            ) : (
              <>
                <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-2 gap-2.5 max-[560px]:grid-cols-1">
                  {payOptions.map((o) => {
                    const on = method === o.id;
                    const Icon = PAY_ICONS[o.id];
                    return (
                      <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={o.blocked}
                        onClick={() => { setPay(o.id); setOrderError(''); }}
                        className={`flex cursor-pointer items-center gap-3 rounded-[18px] border-2 p-4 text-left transition-[border-color,background-color,opacity] duration-300 disabled:cursor-not-allowed disabled:opacity-55 ${on ? 'border-[#FF3D8B] bg-[#FFF3F7]' : 'border-[#111110]/10 bg-white enabled:hover:border-[#111110]/30'}`}
                      >
                        <span className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${on ? 'bg-[#FF3D8B] text-white' : 'bg-[#111110]/6 text-[#111110]'}`}><Icon size={19} /></span>
                        <span className="font-['Inter',sans-serif]">
                          <span className="block text-[15px] font-bold">{o.label}</span>
                          <span className="block text-[13px] text-[#111110]/55">{o.blocked ? `Not available for ${address?.pincode}` : o.sub}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!method && pinInfo && (
                  <p role="alert" className="m-0 mt-3 rounded-[14px] bg-[#FFF0B8] px-4 py-3 font-['Inter',sans-serif] text-[14px] text-[#8A6A00]">Cash on delivery isn't available for {address?.pincode}, and online payment is switched off right now. Try another address, or check back soon.</p>
                )}
                {method === 'RAZORPAY' && (
                  <p className="m-0 mt-3 flex items-center gap-2 font-['Inter',sans-serif] text-[13px] text-[#111110]/60">
                    <ShieldCheck size={16} className="text-[#1E8A4C]" /> You'll pay securely on Razorpay's checkout window.
                  </p>
                )}
                {creditsApplied > 0 && (
                  <p className="m-0 mt-3 flex items-center gap-2 font-['Inter',sans-serif] text-[13px] text-[#111110]/60">
                    <Coins size={16} className="text-[#1E8A4C]" /> {formatPrice(creditsApplied)} is paid with your ZUNUZ Credits.
                  </p>
                )}
              </>
            )}
          </Step>
        </div>

        <aside className={`co-in sticky top-[calc(var(--store-header-h)+var(--announce-h,0px)+20px)] p-6 ${cardCls}`}>
          <h2 className="m-0 mb-4 text-[22px] font-bold">Your order</h2>
          <ul className="m-0 mb-4 flex max-h-[260px] list-none flex-col gap-3 overflow-y-auto p-0" data-lenis-prevent>
            {bag.buyable.map((l) => (
              <li key={l.item.id} className="flex items-center gap-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-[12px] bg-[#EFE8DA]">
                  <img src={l.product?.image || l.item.image} alt="" className="h-full w-full scale-110 object-cover" />
                  <span className="absolute -top-0 -right-0 flex size-5 items-center justify-center rounded-bl-[8px] bg-[#111110] font-['Inter',sans-serif] text-[11px] font-bold text-white">{l.qty}</span>
                </span>
                <span className="min-w-0 flex-1 truncate font-['Inter',sans-serif] text-[14px] font-semibold">{l.item.name}</span>
                <span className="font-['Inter',sans-serif] text-[14px] font-bold">{formatPrice(l.unit * l.qty)}</span>
              </li>
            ))}
          </ul>
          {bag.lines.length > bag.buyable.length && (
            <p className="m-0 mb-3 rounded-[12px] bg-[#FFF0B8] px-3 py-2 font-['Inter',sans-serif] text-[13px] text-[#8A6A00]">Sold-out items in your bag aren't included.</p>
          )}
          <div className="mb-4 flex flex-col gap-2.5">
            <CouponBox coupon={coupon} disabled={placing} lockedNote={comboOn ? 'Navratri combo applied — only one offer per order, so coupons can’t be added.' : useCreditsNow ? 'Turn off credits to use a coupon' : ''} />
            {credits.balance > 0 && (
              <CreditsToggle
                balance={credits.balance}
                on={creditsOn}
                onChange={(v) => { setCreditsOn(v); setOrderError(''); }}
                applied={creditsApplied}
                disabled={placing || coupon.busy}
                lockedNote={comboOn ? 'Navratri combo applied — only one offer per order, so credits can’t be used on this order.' : couponApplied ? 'Remove the coupon to use credits' : ''}
              />
            )}
          </div>
          <TotalsRows
            itemsTotal={bag.itemsTotal}
            deliveryFee={bag.deliveryFee}
            total={total}
            discount={discount}
            couponCode={couponApplied?.code}
            credits={creditsApplied}
            bundleDiscount={bag.bundleDiscount}
            bundleLabel={bag.bundleLabel}
          />
          {orderError && <p role="alert" className="m-0 mt-4 rounded-[14px] bg-[#FFE0EA] px-4 py-3 font-['Inter',sans-serif] text-[14px] text-[#B4123E]">{orderError}</p>}
          {checkoutPaused && (
            <p role="status" className="m-0 mt-5 rounded-[14px] border-2 border-[#F6C915]/60 bg-[#FFF8DB] px-3.5 py-2.5 font-['Inter',sans-serif] text-[13px] font-semibold text-[#7A5A00]">
              {SETTINGS.checkoutPausedMessage}
            </p>
          )}
          <button type="button" onClick={submit} disabled={payDisabled} className={`${primaryBtnCls} mt-5 w-full`}>
            <BtnSweep />
            {payInner}
          </button>
          {notServiceable && !adding && <p className="m-0 mt-2 text-center font-['Inter',sans-serif] text-[12px] font-semibold text-[#E8304F]">We don't deliver to {address.pincode} yet — choose another address.</p>}
          {(adding || !address) && <p className="m-0 mt-2 text-center font-['Inter',sans-serif] text-[12px] text-[#111110]/55">Save a delivery address to continue.</p>}
          <div className="mt-4"><FreeDeliveryBar itemsTotal={bag.discountedItemsTotal ?? bag.itemsTotal} /></div>
        </aside>
      </div>
    );
  }

  return (
    <StoreShell
      after={canPay && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center gap-4 border-t border-[#111110]/10 bg-white/95 px-4 py-3 backdrop-blur-md min-[901px]:hidden">
          <span className="shrink-0">
            <span className="block font-['Inter',sans-serif] text-[12px] text-[#111110]/55">Total</span>
            <span className="text-[20px] font-bold">{formatPrice(total)}</span>
          </span>
          <button type="button" onClick={submit} disabled={payDisabled} className={`${primaryBtnCls} flex-1`}><BtnSweep />{payInner}</button>
        </div>
      )}
    >
      <Seo title="Checkout" path="/checkout" noindex />
      <main ref={rootRef} className="mx-auto max-w-[1180px] px-5 pt-[clamp(20px,3vw,40px)] pb-[clamp(56px,7vw,96px)]">
        <Link to="/cart" className="co-in inline-flex items-center gap-1 font-['Inter',sans-serif] text-[14px] font-semibold text-[#111110]/60 no-underline hover:text-[#FF3D8B]">
          <ChevronLeft size={16} /> Back to bag
        </Link>
        <h1 className="co-in m-0 mt-2 text-[length:clamp(40px,6vw,80px)] leading-[0.95] font-extrabold tracking-[-0.03em] text-[#1A6FE8]">Checkout</h1>
        <p className="co-in m-0 mt-2 flex items-center gap-2 font-['Inter',sans-serif] text-[14px] text-[#111110]/60"><MapPin size={15} /> {SETTINGS.pincodeRestriction ? 'Delivering in Bengaluru for now · 1–3 days' : 'Delivering across India · 2–7 business days'}</p>
        {body}
      </main>
    </StoreShell>
  );
}
