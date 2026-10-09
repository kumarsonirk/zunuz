import { Truck } from 'lucide-react';
import { formatPrice } from '../../store/catalogConfig';
import { amountToFreeDelivery, FREE_DELIVERY_THRESHOLD } from '../../utils/delivery';

// Free-delivery progress + the totals block, shared by the bag and checkout.
export function FreeDeliveryBar({ itemsTotal }) {
  const left = amountToFreeDelivery(itemsTotal);
  const pct = Math.min(100, (itemsTotal / FREE_DELIVERY_THRESHOLD) * 100);
  return (
    <div className="rounded-[18px] bg-white/70 p-4">
      <p className="m-0 flex items-center gap-2 font-['Inter',sans-serif] text-[14px] font-semibold">
        <Truck size={17} className="text-[#FF3D8B]" />
        {left ? <>You're <b className="text-[#FF3D8B]">{formatPrice(left)}</b> away from free delivery</> : <>Yay — free delivery unlocked! 🎉</>}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#111110]/8">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#FF3D8B,#F6C915)] transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// `discount` / `couponCode` are optional (checkout with an applied coupon);
// `credits` = ZUNUZ Credits applied at checkout.
export function TotalsRows({ itemsTotal, deliveryFee, total, discount = 0, couponCode = null, credits = 0, bundleDiscount = 0, bundleLabel = null }) {
  const totalSavings = (discount || 0) + (bundleDiscount || 0);
  return (
    <dl className="m-0 flex flex-col gap-2.5 font-['Inter',sans-serif] text-[15px]">
      <div className="flex justify-between"><dt className="text-[#111110]/65">Items total</dt><dd className="m-0 font-semibold">{formatPrice(itemsTotal)}</dd></div>
      {bundleDiscount > 0 && (
        <div className="flex justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-[#111110]/65">
            <span>{bundleLabel || 'Navratri Combo Offer'}</span>
            <span className="rounded-full bg-[#FFF0B8] px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#8A6A00]">OFFER</span>
          </dt>
          <dd className="m-0 font-semibold text-[#1E8A4C]">−{formatPrice(bundleDiscount)}</dd>
        </div>
      )}
      {discount > 0 && (
        <div className="flex justify-between gap-3">
          <dt className="text-[#111110]/65">Discount{couponCode && <span className="ml-1.5 rounded-full bg-[#FFE0EA] px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#FF3D8B]">{couponCode}</span>}</dt>
          <dd className="m-0 font-semibold text-[#1E8A4C]">−{formatPrice(discount)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-[#111110]/65">Delivery</dt>
        <dd className={`m-0 font-semibold ${deliveryFee ? '' : 'text-[#1E8A4C]'}`}>{deliveryFee ? formatPrice(deliveryFee) : 'Free'}</dd>
      </div>
      {credits > 0 && (
        <div className="flex justify-between gap-3">
          <dt className="text-[#111110]/65">ZUNUZ Credits</dt>
          <dd className="m-0 font-semibold text-[#1E8A4C]">−{formatPrice(credits)}</dd>
        </div>
      )}
      <div className="mt-1 flex items-baseline justify-between border-t border-[#111110]/10 pt-3">
        <dt className="text-[17px] font-bold">Total</dt>
        <dd className="m-0 font-['Bricolage_Grotesque',sans-serif] text-[26px] font-bold">{formatPrice(total)}</dd>
      </div>
      <p className="m-0 text-right text-[12px] text-[#111110]/50">{totalSavings > 0 ? `You save ${formatPrice(totalSavings)} · ` : ''}Inclusive of all taxes</p>
    </dl>
  );
}
