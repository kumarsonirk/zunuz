import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'ZUNUZ';
const DEFAULT_DESCRIPTION = "Find your vibe with ZUNUZ — everyday jewelry for campus, office, and everywhere in between. Necklaces, earrings & bracelets. You like it, you buy it.";
const DEFAULT_IMAGE = '/logo_white.png';
// zunuz.in 308-redirects to www.zunuz.in in production (Vercel's configured
// canonical host) — canonical/OG URLs must point at the domain that actually
// serves 200, or Google treats them as pointing at a redirect target.
const SITE_URL = 'https://www.zunuz.in';

// Centralizes title/description/canonical/Open-Graph/Twitter-card tags so
// every page gets a consistent, correct <head> instead of the one static
// <title> the whole SPA used to share — the single biggest lever for how
// individual pages (especially products) show up in search results.
export default function Seo({ title, description = DEFAULT_DESCRIPTION, path = '', image = DEFAULT_IMAGE, type = 'website', noindex = false }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Everyday Fashion Jewellery`;
  const url = `${SITE_URL}${path}`;
  const absoluteImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph (Facebook, WhatsApp, LinkedIn link previews) */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={absoluteImage} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
    </Helmet>
  );
}
