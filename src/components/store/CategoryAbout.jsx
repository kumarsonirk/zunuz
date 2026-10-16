import { CATEGORY_COPY } from '../../seo/categoryCopy';

// Under the product grid on /shop, /earrings, /necklaces, /bracelets: a short
// "about" text for the page (src/seo/categoryCopy.js) — it gives Google words
// to rank the page for, without pushing the products down. Links to the
// other shop pages are already in the footer (SiteFooter), so none here.
export default function CategoryAbout({ path }) {
  const copy = CATEGORY_COPY[path];
  if (!copy) return null;
  return (
    <section aria-labelledby="cat-about" className="mx-auto max-w-[1240px] px-5 pb-[clamp(56px,8vw,110px)]">
      <div className="rounded-[clamp(20px,2.4vw,32px)] bg-white/60 p-[clamp(22px,3.2vw,44px)] shadow-[0_18px_40px_-30px_rgba(17,17,16,0.4)]">
        <div className="max-w-[820px]">
          <h2 id="cat-about" className="m-0 text-[length:clamp(24px,2.8vw,38px)] font-bold leading-[1.1] tracking-[-0.01em]">{copy.heading}</h2>
          {copy.paragraphs.map((t) => (
            <p key={t.slice(0, 24)} className="m-0 mt-3 font-['Inter',sans-serif] text-[length:clamp(14px,1.15vw,16px)] leading-relaxed text-[#111110]/75">{t}</p>
          ))}
          {copy.styles?.length > 0 && (
            <p className="m-0 mt-4 font-['Inter',sans-serif] text-[13px] text-[#111110]/55">
              <span className="font-semibold text-[#111110]/70">Popular styles:</span> {copy.styles.join(' · ')}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
