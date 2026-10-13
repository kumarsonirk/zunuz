import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, MapPin, Star, ArrowRight, Heart, Coins } from 'lucide-react';
import AccountLayout from '../../components/store/AccountLayout';
import ProductCard from '../../components/store/ProductCard';
import { OrderStatusBadge } from '../../components/store/OrderBits';
import VerifyEmailBanner from '../../components/store/VerifyEmailBanner';
import { cardCls, primaryBtnCls, BtnSweep } from '../../components/store/StoreShell';
import Seo from '../../components/Seo';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { useCatalog } from '../../store/catalog';
import { useWishlist } from '../../store/wishlist';
import { formatPrice } from '../../store/catalogConfig';
import { SETTINGS } from '../../store/settings';
import { thumbUrl } from '../../utils/productImage';

// Account overview (/account): counts (orders / addresses / reviews) that
// link to their pages, the ZUNUZ Credits balance (→ Refer & Earn), the
// latest order, and the wishlist.
export default function AccountPage() {
  const { customer } = useAuth();
  const [data, setData] = useState(null);
  const catalog = useCatalog();
  const wishIds = useWishlist();
  const wished = catalog.products.filter((p) => wishIds.includes(p.id));

  useEffect(() => {
    if (!customer) return undefined;
    let alive = true;
    Promise.all([
      api.get('/orders').catch(() => []),
      api.get('/customers/addresses').catch(() => []),
      api.get('/customers/me/reviews').catch(() => []),
      api.get('/credits/me').catch(() => null),
    ]).then(([orders, addresses, reviews, credits]) => { if (alive) setData({ orders, addresses, reviews, credits }); });
    return () => { alive = false; };
  }, [customer]);

  const first = customer?.name?.split(' ')[0];
  const stats = [
    { to: '/account/orders', label: 'Orders', icon: Package, n: data?.orders.length, tint: 'bg-[#FFE0EA] text-[#FF3D8B]' },
    { to: '/account/addresses', label: 'Saved addresses', icon: MapPin, n: data?.addresses.length, tint: 'bg-[#D6E6FF] text-[#1A6FE8]' },
    { to: '/account/reviews', label: 'Reviews', icon: Star, n: data?.reviews.length, tint: 'bg-[#FFF0B8] text-[#8A6A00]' },
  ];
  const latest = data?.orders[0];
  const creditBalance = data?.credits ? Math.max(0, Number(data.credits.balance) || 0) : null;
  const showCredits = SETTINGS.referralEnabled || (creditBalance || 0) > 0;

  return (
    <AccountLayout title={first ? `Hey, ${first}!` : 'Hey there!'} subtitle="Everything about your orders and account, in one place.">
      <Seo title="My account" path="/account" noindex />
      <VerifyEmailBanner className="ac-in mb-4" />
      <div className="grid grid-cols-3 gap-3 max-[560px]:gap-2">
        {stats.map(({ to, label, icon: Icon, n, tint }) => (
          <Link key={to} to={to} className={`ac-in group/s flex items-center gap-4 p-5 text-[#111110] max-[560px]:flex-col max-[560px]:items-start max-[560px]:gap-2 max-[560px]:p-4 no-underline transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_44px_-26px_rgba(17,17,16,0.55)] ${cardCls}`}>
            <span className={`flex size-12 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/s:rotate-[-10deg] group-hover/s:scale-110 ${tint}`}><Icon size={22} /></span>
            <span className="flex-1">
              <span className="block text-[30px] leading-none font-bold">{n ?? <span className="inline-block h-7 w-8 animate-pulse rounded-md bg-[#EFE8DA] align-middle" />}</span>
              <span className="mt-1 block font-['Inter',sans-serif] text-[14px] text-[#111110]/60 max-[560px]:text-[12px]">{label}</span>
            </span>
            <ArrowRight size={18} className="text-[#111110]/30 max-[560px]:hidden transition-[translate,color] duration-300 group-hover/s:translate-x-1 group-hover/s:text-[#FF3D8B]" />
          </Link>
        ))}
      </div>

      {showCredits && (
        <Link to="/account/refer" className={`ac-in group/s mt-3 flex items-center gap-4 p-5 text-[#111110] no-underline transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_44px_-26px_rgba(17,17,16,0.55)] max-[560px]:p-4 ${cardCls}`}>
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#E8F7EE] text-[#1E8A4C] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/s:rotate-[-10deg] group-hover/s:scale-110"><Coins size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-['Inter',sans-serif] text-[14px] text-[#111110]/60">ZUNUZ Credits</span>
            <span className="block text-[26px] leading-tight font-bold">
              {data ? formatPrice(creditBalance || 0) : <span className="inline-block h-7 w-16 animate-pulse rounded-md bg-[#EFE8DA] align-middle" />}
            </span>
            {SETTINGS.referralEnabled && (
              <span className="mt-0.5 hidden font-['Inter',sans-serif] text-[13px] font-bold text-[#FF3D8B] max-[560px]:block">
                Refer a friend, get {formatPrice(SETTINGS.referralReward)}
              </span>
            )}
          </span>
          {SETTINGS.referralEnabled && (
            <span className="shrink-0 font-['Inter',sans-serif] text-[14px] font-bold text-[#FF3D8B] max-[560px]:hidden">
              Refer a friend, get {formatPrice(SETTINGS.referralReward)}
            </span>
          )}
          <ArrowRight size={18} className="shrink-0 text-[#111110]/30 transition-[translate,color] duration-300 group-hover/s:translate-x-1 group-hover/s:text-[#FF3D8B]" />
        </Link>
      )}

      <section className={`ac-in mt-5 p-6 ${cardCls}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-[22px] font-bold">Latest order</h2>
          {latest && <Link to="/account/orders" className="font-['Inter',sans-serif] text-[14px] font-bold text-[#1A6FE8] no-underline hover:underline">All orders →</Link>}
        </div>
        {!data ? (
          <div className="mt-4 h-20 animate-pulse rounded-[16px] bg-[#EFE8DA]" />
        ) : latest ? (
          <Link to={`/account/orders?open=${latest.id}`} className="mt-4 flex flex-wrap items-center gap-4 rounded-[18px] bg-[#FFF8EE] p-4 text-[#111110] no-underline transition-colors hover:bg-[#FFF0DA]">
            <span className="flex -space-x-3">
              {latest.items.slice(0, 3).map((i) => (
                <span key={i.id} className="size-14 overflow-hidden rounded-[14px] border-2 border-white bg-[#EFE8DA]">
                  {i.product?.image && <img src={thumbUrl(i.product.image, 400)} data-original={i.product.image} alt="" className="h-full w-full scale-110 object-cover" />}
                </span>
              ))}
            </span>
            <span className="min-w-0 flex-1 font-['Inter',sans-serif] max-[560px]:basis-[calc(100%-110px)]">
              <span className="block text-[15px] font-bold">Order #{latest.id}</span>
              <span className="text-[13px] text-[#111110]/55">{new Date(latest.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {latest.items.length} item{latest.items.length === 1 ? '' : 's'}</span>
            </span>
            <OrderStatusBadge status={latest.status} />
            <span className="text-[18px] font-bold">{formatPrice(latest.total)}</span>
          </Link>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-[#FFF8EE] p-5">
            <p className="m-0 font-['Inter',sans-serif] text-[15px] text-[#111110]/65">No orders yet — your first one is a click away.</p>
            <Link to="/jewellery" className={primaryBtnCls}><BtnSweep />Start shopping</Link>
          </div>
        )}
      </section>

      <section className="ac-in mt-8">
        <h2 className="m-0 flex items-center gap-2 text-[22px] font-bold"><Heart size={20} className="text-[#FF3D8B]" fill="currentColor" /> Your wishlist</h2>
        {wished.length ? (
          <div className="mt-4 grid grid-cols-3 gap-[clamp(10px,1.6vw,18px)] max-[700px]:grid-cols-2">
            {wished.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <p className="m-0 mt-3 font-['Inter',sans-serif] text-[15px] text-[#111110]/60">
            Tap the ♥ on any product to save it here. <Link to="/jewellery" className="font-bold text-[#FF3D8B]">Browse jewellery</Link>
          </p>
        )}
      </section>
    </AccountLayout>
  );
}
