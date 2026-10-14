// Writes SEO tags into an HTML page (string in, string out). Used at build
// time by vite.config.js (fixed pages) and per request by
// api/product-page.js (product pages), so crawlers and link previews see
// the right title / description / image without running any JavaScript.
// Tags carry data-seo: main.jsx removes them just before the app's first
// render, and each page's <Seo> (react-helmet) then sets the same values —
// so the running page never has two canonicals / descriptions.
// Plain JS, no browser APIs.
import { SITE_URL, SITE_NAME, fullTitle } from './pages.js';

const escapeAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeText = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// In JSON-LD, "<" is written as its unicode escape so text inside the JSON
// can never close the <script> tag early.
const LT_ESCAPED = `${String.fromCharCode(92)}u003c`;
const NL = '\n';

export function seoHeadTags({ title, description, path = '', image = '/logo_white.png', type = 'website', jsonLd = [], noindex = false }) {
  const full = fullTitle(title);
  const url = `${SITE_URL}${path}`;
  const img = /^https?:/.test(image) ? image : `${SITE_URL}${image}`;
  const meta = (attr, key, content) => `<meta ${attr}="${key}" content="${escapeAttr(content)}" data-seo>`;
  return [
    meta('name', 'description', description),
    `<link rel="canonical" href="${escapeAttr(url)}" data-seo>`,
    noindex ? meta('name', 'robots', 'noindex, nofollow') : '',
    meta('property', 'og:type', type),
    meta('property', 'og:site_name', SITE_NAME),
    meta('property', 'og:title', full),
    meta('property', 'og:description', description),
    meta('property', 'og:url', url),
    meta('property', 'og:image', img),
    meta('property', 'og:image:secure_url', img),
    /\.jpe?g$/i.test(img) ? meta('property', 'og:image:type', 'image/jpeg') : '',
    meta('property', 'og:image:alt', full),
    meta('property', 'og:locale', 'en_IN'),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', full),
    meta('name', 'twitter:description', description),
    meta('name', 'twitter:image', img),
    ...jsonLd.map((o) => `<script type="application/ld+json" data-seo>${JSON.stringify(o).replace(/</g, LT_ESCAPED)}</script>`),
  ].filter(Boolean).join(`${NL}    `);
}

// The tags go at the very top of <head> (right after <meta charset>), title
// first: some link-preview crawlers — WhatsApp's especially — only read the
// start of a page and give up before the app's scripts end.
export function withSeo(html, page) {
  const tags = `<title>${escapeText(fullTitle(page.title))}</title>${NL}    ${seoHeadTags(page)}`;
  const body = html.replace(/\s*<title>[\s\S]*?<\/title>/, '');
  const charset = body.match(/<meta charset[^>]*>/i);
  if (charset) return body.replace(charset[0], `${charset[0]}${NL}    ${tags}`);
  return body.replace('<head>', `<head>${NL}    ${tags}`);
}
