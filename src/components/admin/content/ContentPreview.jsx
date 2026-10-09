// Small live previews of each storefront content block, drawn in the
// storefront's cream style (fixed colours on purpose — it's a picture of the
// shop, so it looks the same in the admin's dark and light themes). They're
// approximations of the real sections, scaled down, not pixel copies.

const FONT = "font-['Bricolage_Grotesque','Inter',sans-serif]";
const INTER = "font-['Inter',sans-serif]";
const SCRIPT = "font-['Momo_Signature',cursive]";

const bg = (src) => (src ? { backgroundImage: `url("${src}")` } : undefined);

function Frame({ children, className = '', label }) {
  return (
    <div aria-label={label ? `Preview: ${label}` : 'Preview'} role="img" className={`relative overflow-hidden rounded-[14px] border border-black/10 text-[#111110] shadow-[0_12px_30px_-22px_rgba(0,0,0,0.6)] ${FONT} ${className}`}>
      {children}
    </div>
  );
}

const Pill = ({ children, className = '' }) => (
  <span className={`inline-flex max-w-full items-center truncate rounded-full px-3 py-1 text-[10px] font-semibold ${className}`}>{children}</span>
);

function HomeHero({ v }) {
  return (
    <Frame label="Home hero" className="aspect-[16/10] bg-[#E8304F]">
      <div className="absolute inset-0 bg-[length:auto_100%] bg-[position:30%_bottom] bg-no-repeat" style={bg(v.image)} />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 py-2 text-[8px] font-bold text-white/90"><span>ZUNUZ</span><span>Shop · Bag</span></div>
      <div className="absolute top-[18%] right-[4%] left-[52%]">
        <div className="pl-[22%] text-[clamp(14px,3.2vw,22px)] leading-[0.98] font-bold text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.25)]">
          {v.headline.map((l, i) => <div key={i} className="truncate">{l}</div>)}
        </div>
        <p className="m-0 mt-1.5 line-clamp-2 text-[9px] font-semibold">{v.tagline}</p>
        <p className="m-0 mt-0.5 truncate text-[9px] text-white">{v.priceLine}</p>
        <Pill className="mt-1.5 border border-white text-white">{v.buttonLabel}</Pill>
      </div>
      <div className="absolute inset-x-0 bottom-0 truncate bg-[#F6C915] px-2 py-1 text-[8px] font-semibold">Clothes + jewellery for every version of you. ✦</div>
    </Frame>
  );
}

function HomeHeroNavratri({ v }) {
  return (
    <Frame label="Navratri Hero Slide" className="aspect-[16/10] bg-[#E8304F]">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40" style={bg(v.image)} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(246,201,21,0.25),transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 py-2 text-[8px] font-bold text-white/90">
        <span className="text-[#F6C915]">✦ FESTIVE SPECIAL</span>
        <span>ZUNUZ</span>
      </div>
      <div className="absolute top-[16%] right-[4%] left-[10%] text-center sm:text-left">
        {v.badge && <span className="inline-block rounded-full bg-[#F6C915] px-2 py-0.5 text-[8px] font-extrabold text-[#111110] tracking-wider mb-1">✦ {v.badge} ✦</span>}
        <div className="text-[clamp(14px,3.2vw,22px)] leading-[0.98] font-black text-[#F6C915] [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
          {(v.headline || []).map((l, i) => <div key={i} className="truncate">{l}</div>)}
        </div>
        <p className="m-0 mt-1 line-clamp-2 text-[9px] font-medium text-white/90">{v.tagline}</p>
        <p className="m-0 mt-0.5 truncate text-[9px] font-bold text-[#F6C915]">{v.priceLine}</p>
        <Pill className="mt-1.5 border border-[#F6C915] bg-[#F6C915] text-[#111110] font-bold">{v.buttonLabel} →</Pill>
      </div>
      <div className="absolute inset-x-0 bottom-0 truncate bg-[#F6C915] px-2 py-1 text-[8px] font-bold text-[#111110]">
        Festive Dhamaka · Pick Any 3 @ ₹999 · Limited Offer ✦
      </div>
    </Frame>
  );
}

function Marquee({ v }) {
  return (
    <Frame label="Scrolling strip" className="bg-[#F6C915]">
      <div className="flex gap-3 overflow-hidden px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap">
        {[0, 1].flatMap((r) => [].concat(v.text).map((t, i) => <span key={`${r}-${i}`} className="shrink-0">{t} ✦</span>))}
      </div>
    </Frame>
  );
}

function Budget({ v }) {
  const prices = [199, 499, 999];
  return (
    <Frame label="Jewellery, by budget" className="bg-[#FFFBED] p-3.5">
      <p className="m-0 text-[15px] leading-tight font-bold">{v.heading} 👀</p>
      <p className="m-0 mt-0.5 text-[11px] font-medium text-[#4EB8C9]">{v.subheading}</p>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {prices.map((p, i) => (
          <div key={p} className={`relative aspect-[466/600] overflow-hidden rounded-[10px] bg-[#EFE8DA] bg-cover bg-center ${i === 1 ? 'text-[#111110]' : 'text-white'}`} style={bg(v[`card${i + 1}Image`])}>
            <div className="absolute inset-x-0 bottom-0 p-1.5">
              <p className="m-0 text-[12px] leading-none font-bold">₹{p}+</p>
              <p className="m-0 mt-0.5 line-clamp-3 text-[7px] leading-tight font-medium">{v[`card${i + 1}Copy`]}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="m-0 mt-2 text-right text-[11px] font-bold text-[#1A6FE8]">{v.linkLabel} →</p>
    </Frame>
  );
}

function Brand({ v }) {
  return (
    <Frame label="Brand statement" className="bg-[#FFFDF7] px-4 py-6 text-center">
      <p className="m-0 text-[18px] leading-tight font-bold text-[#FF3D8B]">{v.headline}</p>
      <p className={`m-0 mt-2 text-[9.5px] leading-snug font-medium ${INTER}`}>{v.line1} {v.line2}</p>
      <Pill className="mt-3 bg-[#FF3D8B] text-white">{v.buttonLabel} →</Pill>
    </Frame>
  );
}

function ScriptBanner({ v, overlay }) {
  return (
    <Frame label="Banner" className="aspect-[16/9] bg-[#D8C3AD] bg-cover bg-center">
      <div className="absolute inset-0 bg-cover bg-center" style={bg(v.image)} />
      {overlay && <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(17,17,16,0.45),transparent_60%)]" />}
      <div className={`absolute inset-x-0 flex justify-center px-3 ${overlay ? 'bottom-[8%]' : 'top-[38%]'}`}>
        <span className={`${SCRIPT} truncate text-[26px] text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.2)]`}>{v.text}</span>
      </div>
    </Frame>
  );
}

function Under499({ v }) {
  return (
    <Frame label="Under ₹499 edit" className="bg-[#FFF8E7] p-3.5">
      <p className="m-0 text-[16px] font-bold">{v.title}</p>
      <p className="m-0 text-[11px] text-[#111110]/65">{v.subtitle}</p>
      <div className="mt-2 grid grid-cols-4 gap-1.5">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-square rounded-[8px] bg-white" />)}</div>
      <p className="m-0 mt-2 text-right text-[11px] font-bold text-[#1A6FE8]">{v.linkLabel} →</p>
    </Frame>
  );
}

function Follow({ v }) {
  return (
    <Frame label="Follow the fits" className="bg-[#FFFBEA] p-3.5">
      <Pill className="border border-[#FF3D8B]/30 bg-white">@zunuz</Pill>
      <p className="m-0 mt-1.5 text-[18px] font-bold">Follow the <span className={`${SCRIPT} font-normal text-[#FF3D8B]`}>fits</span></p>
      <p className={`m-0 mt-1 text-[10px] text-[#111110]/80 ${INTER}`}>{v.description}</p>
      <p className={`m-0 mt-1 text-[9px] text-[#111110]/55 ${INTER}`}>{v.note}</p>
    </Frame>
  );
}

function Faq({ v }) {
  return (
    <Frame label="FAQ heading" className="bg-[#FFF7EC] p-3.5">
      <p className="m-0 text-[24px] leading-none font-bold">{v.heading}</p>
      <p className="m-0 mt-1.5 text-[12px] font-semibold">{v.lead} <span className={`${SCRIPT} font-normal text-[#FF3D8B]`}>{v.script}</span></p>
      <div className="mt-2.5 flex items-center gap-2 rounded-[12px] border border-black/10 bg-white/80 p-2">
        <span className="text-[16px]">👀</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[10px] font-bold">{v.stuckTitle}</span>
          <span className={`block truncate text-[9px] text-[#111110]/65 ${INTER}`}>{v.stuckText}</span>
        </span>
        <Pill className="bg-[#FF3D8B] text-white">Contact us</Pill>
      </div>
    </Frame>
  );
}

function Newsletter({ v }) {
  return (
    <Frame label="Newsletter" className="bg-[#FFFBEA] p-2.5">
      <div className="rounded-[14px] bg-[#4EC5CF] p-3.5">
        <p className="m-0 text-[15px] leading-tight font-bold">{v.heading} <span className={`${SCRIPT} font-normal text-white`}>{v.script}</span></p>
        <p className={`m-0 mt-1 text-[10px] text-[#111110]/80 ${INTER}`}>{v.subtext}</p>
        <div className="mt-2 flex gap-1.5">
          <span className={`flex-1 rounded-[8px] bg-white px-2 py-1.5 text-[9px] text-[#111110]/45 ${INTER}`}>Your email address</span>
          <span className="rounded-[8px] bg-[#F6C915] px-2.5 py-1.5 text-[9px] font-bold">{v.buttonLabel} →</span>
        </div>
        <p className={`m-0 mt-1.5 text-[9px] ${INTER}`}><b>{v.doneTitle}</b> {v.doneText}</p>
      </div>
    </Frame>
  );
}

function JewelleryHero({ v }) {
  return (
    <Frame label="Jewellery hero" className="aspect-[16/10] bg-[#E8304F]">
      <div className="absolute inset-0 bg-[length:auto_108%] bg-[position:70%_bottom] bg-no-repeat" style={bg(v.image)} />
      <div className="absolute inset-y-0 right-[4%] left-[50%] flex flex-col justify-center">
        <div className="text-[clamp(14px,3vw,22px)] leading-[1.02] font-bold text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.25)]">
          {v.headline.map((l, i) => <div key={i} className="truncate">{l}</div>)}
        </div>
        <p className="m-0 mt-1.5 line-clamp-2 text-[9px] font-semibold">{v.tagline}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Pill className="bg-[#111110] text-white">{v.primaryLabel}</Pill>
          <Pill className="border border-white text-white">{v.secondaryLabel}</Pill>
        </div>
      </div>
    </Frame>
  );
}

function Trending({ v }) {
  return (
    <Frame label="Trending now" className="bg-[#FFEFE6] p-3.5 text-center">
      <Pill className="bg-white/80 text-[#E8304F]">● LIVE</Pill>
      <p className="m-0 mt-1 text-[20px] font-bold">{v.heading}</p>
      <div className="mt-2 flex justify-center">
        {[-2, -1, 0, 1, 2].map((d) => <div key={d} className="-mx-1 size-9 rounded-[8px] border-2 border-white bg-[#F3E9D2]" style={{ transform: `rotate(${d * 6}deg) translateY(${Math.abs(d) * 3}px)` }} />)}
      </div>
      <p className={`m-0 mt-2 text-[10px] text-[#111110]/70 ${INTER}`}>{v.caption}</p>
      <Pill className="mt-1.5 bg-[#111110] text-white">{v.buttonLabel} →</Pill>
    </Frame>
  );
}

const VibeBanner = ({ v }) => <ScriptBanner v={v} />;
const PosterBanner = ({ v }) => <ScriptBanner v={v} overlay />;

const PREVIEWS = {
  'home.hero': HomeHero,
  'home.heroNavratri': HomeHeroNavratri,
  'home.marquee': Marquee,
  'shared.budget': Budget,
  'home.brand': Brand,
  'home.vibeBanner': VibeBanner,
  'home.under499': Under499,
  'home.posterBanner': PosterBanner,
  'home.follow': Follow,
  'home.faq': Faq,
  'home.newsletter': Newsletter,
  'jewellery.hero': JewelleryHero,
  'jewellery.trending': Trending,
};

export default function ContentPreview({ blockKey, value }) {
  const P = PREVIEWS[blockKey];
  if (!P) return null;
  return <P v={value} />;
}

// The announcement strip, as it looks at the top of the shop.
export function AnnouncementPreview({ text, link }) {
  return (
    <Frame label="Announcement bar" className="bg-[#FFF8EE]">
      <div className={`flex h-[30px] items-center gap-2 bg-[#FF3D8B] px-3 text-[11px] font-semibold text-white ${INTER}`}>
        <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
          <span className="text-[#F6C915]">✦</span>
          <span className="truncate">{text || 'No text yet'}</span>
          {link && <span>→</span>}
        </span>
        <span aria-hidden="true" className="opacity-80">✕</span>
      </div>
      <div className="flex items-center justify-between bg-[#1F2024] px-3 py-2 text-[9px] font-bold text-white/90"><span>ZUNUZ</span><span>Shop · Bag</span></div>
    </Frame>
  );
}
