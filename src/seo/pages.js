// Search titles + descriptions for the storefront's fixed pages, in one place.
// Used twice, so they always match:
// - by each page's <Seo> (what Google sees after the app has run);
// - at build time by vite.config.js, which writes them into a copy of
//   index.html per page (what crawlers and link previews — WhatsApp,
//   Instagram, Bing — see before any JavaScript runs).
// `title` gets " | ZUNUZ" appended by <Seo>; keep it ≤ ~55 characters and the
// description ≤ ~155. Product pages get theirs from the product itself
// (api/product-page.js + ProductPage).
// Plain JS with no imports — vite.config.js loads it in Node.

export const SITE_URL = 'https://www.zunuz.in';
export const SITE_NAME = 'ZUNUZ';
export const INSTAGRAM_URL = 'https://www.instagram.com/zunuz_official/';

export const SEO_PAGES = {
  '/': {
    title: 'Everyday Fashion Jewellery Online from ₹199',
    description: 'Shop trendy everyday jewellery at ZUNUZ — earrings, necklaces and bracelets from ₹199. Gift-ready pieces for college, office and every occasion.',
  },
  '/jewellery': {
    title: 'Jewellery for Women – Earrings, Necklaces & Bracelets',
    description: 'Explore the ZUNUZ jewellery collection: statement earrings, dainty necklaces and stackable bracelets from ₹199. Shop by category or by budget.',
  },
  '/shop': {
    title: 'Shop All Jewellery – Prices from ₹199',
    description: 'Browse every ZUNUZ piece in one place. Filter by category and budget (₹199+, ₹499+, ₹999+) to find your next favourite earrings, necklace or bracelet.',
  },
  '/earrings': {
    title: 'Earrings for Women – Jhumkas, Studs & Drops',
    description: 'Shop ZUNUZ earrings for women — jhumkas, studs, drops and hoops for college, office and festive days. Trendy designs from ₹199.',
  },
  '/necklaces': {
    title: 'Necklaces & Pendants for Women',
    description: 'Shop ZUNUZ necklaces and pendants for women — dainty everyday chains and statement pieces for parties and festivals.',
  },
  '/bracelets': {
    title: 'Bracelets for Women – Dainty & Stackable',
    description: 'Shop ZUNUZ bracelets for women — dainty chains and stackable styles to wear every day or gift to someone special.',
  },
  '/festive-glow': {
    title: 'Festive Glow – Festive Jewellery Edit',
    description: 'Shine bright with the ZUNUZ Festive Glow edit — 18k gold-plated necklaces, bracelets and earrings crafted for celebrations.',
  },
  '/navratri-offers': {
    title: 'Navratri Jewellery Combo Offer',
    description: 'Pick your favourite ZUNUZ earrings, necklaces and bracelets as a combo at one special price — our Navratri offer for nine nights of style.',
  },
  '/customer-care': {
    title: 'Customer Care',
    description: 'Get help with ZUNUZ orders — shipping, returns & replacements, cancellations, and product care, all in one place.',
  },
  '/customer-care/faq': {
    title: 'Frequently Asked Questions',
    description: 'Answers to common questions about ZUNUZ orders, shipping, returns, and payments.',
  },
  '/customer-care/shipping-policy': {
    title: 'Shipping Policy',
    description: "Learn about ZUNUZ's order processing times, delivery timelines, shipping charges, and how lost or damaged shipments are handled.",
  },
  '/customer-care/returns-replacements': {
    title: 'Returns & Replacements',
    description: "ZUNUZ's policy on returns, replacements, and refunds for damaged, defective, or incorrect jewellery orders.",
  },
  '/customer-care/cancellation-policy': {
    title: 'Cancellation Policy',
    description: 'Find out how and when you can cancel a ZUNUZ order, and how refunds for cancelled orders are processed.',
  },
  '/customer-care/product-care': {
    title: 'Product Care Guide',
    description: 'Tips for caring for, cleaning, and storing your ZUNUZ fashion jewellery to help keep it looking its best for longer.',
  },
  '/terms': {
    title: 'Terms & Conditions',
    description: "Read ZUNUZ's terms and conditions covering website use, product information, pricing, orders, shipping, and returns.",
  },
  '/privacy': {
    title: 'Privacy Policy',
    description: "ZUNUZ's privacy policy explaining what personal information we collect, how it's used, and how it's protected.",
  },
};

// Home page only: who we are, for Google's knowledge panel / sitelinks.
export const HOME_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo_dark.png`,
    sameAs: [INSTAGRAM_URL],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  },
];

export const fullTitle = (title) => (title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Everyday Fashion Jewellery`);
