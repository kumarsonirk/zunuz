import { Helmet } from 'react-helmet-async';
import { SITE_URL, SITE_NAME, SEO_PAGES, fullTitle } from '../seo/pages';

const DEFAULT_DESCRIPTION = SEO_PAGES['/'].description;
const DEFAULT_IMAGE = '/logo_white.png';
// SITE_URL is www.zunuz.in: zunuz.in 308-redirects there in production
// (Vercel's configured canonical host) — canonical/OG URLs must point at the
// domain that actually serves 200, or Google treats them as pointing at a
// redirect target.

// Centralizes title/description/canonical/Open-Graph/Twitter-card tags so
// every page gets a consistent, correct <head> instead of the one static
// <title> the whole SPA used to share — the single biggest lever for how
// individual pages (especially products) show up in search results.
// Fixed pages take their text from src/seo/pages.js (also written into the
// pre-built HTML at build time). `jsonLd`: schema.org object(s) for rich
// results (products, breadcrumbs, organization).
export default function Seo({ title, description = DEFAULT_DESCRIPTION, path = '', image = DEFAULT_IMAGE, type = 'website', noindex = false, jsonLd }) {
  const full = fullTitle(title);
  const url = `${SITE_URL}${path}`;
  const absoluteImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;
  const ld = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{full}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph (Facebook, WhatsApp, LinkedIn link previews) */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={absoluteImage} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={full} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />

      {ld.map((obj, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(obj)}</script>
      ))}
    </Helmet>
  );
}
