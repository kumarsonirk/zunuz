import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import AuthLayout from '../../components/store/AuthLayout';
import { primaryBtnCls, ghostBtnCls, BtnSweep } from '../../components/store/StoreShell';
import Seo from '../../components/Seo';

// Any address the store doesn't know. Used to silently redirect to the home
// page, which made every mistyped / old link look like a copy of the home
// page to Google ("soft 404"). Now it says so, is kept out of search
// (noindex), and points people to the shop.
export default function NotFoundPage() {
  return (
    <AuthLayout image="/modal2.webp" title="Page not found" accent="text-[#E8304F]" tagline="Lost? The good stuff is this way.">
      <Seo title="Page not found" noindex />
      <div className="flex flex-col gap-4">
        <div className="au-in flex flex-col items-center rounded-[22px] bg-white/85 px-6 py-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-[#FFE3E8] text-[#E8304F]"><SearchX size={26} /></span>
          <p className="m-0 mt-3 text-[22px] font-bold">We couldn't find that page</p>
          <p className="m-0 mt-1 font-['Inter',sans-serif] text-[14px] text-[#111110]/65">The link may be old or mistyped. Everything we sell is one tap away.</p>
        </div>
        <Link to="/jewellery" className={`au-in ${primaryBtnCls} w-full`}><BtnSweep />Shop jewellery</Link>
        <Link to="/" className={`au-in ${ghostBtnCls} w-full`}>Go to the home page</Link>
      </div>
    </AuthLayout>
  );
}
