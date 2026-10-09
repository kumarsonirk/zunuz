const router = require('express').Router();

const DEFAULTS = require('../lib/contentDefaults.json');

const prisma = require('../lib/prisma');

// Editable storefront content (admin → Homepage & Banners).
//
// BLOCKS is the schema: one entry per editable block and its fields. Each
// field's default (the storefront's built-in copy) comes from
// lib/contentDefaults.json — the storefront imports the same file
// (src/store/content.js), so there is one copy of the defaults. Only overrides are stored (ContentBlock rows, value = JSON of the
// fields that differ from the default), so a block with no row simply shows
// the built-in copy, and "Reset to default" deletes the row.
//
// Field types:
//   text      single line, `max` chars
//   textarea  multi-line-ish copy, `max` chars
//   lines     array of short lines (headline rows), `maxLines` × `max` chars
//   link      internal path (/shop?x=y) or http(s) URL
//   image     site path (/poster2.png, /uploads/…) or http(s) URL
const t = (name, label, max, extra = {}) => ({ name, label, type: 'text', max, required: true, ...extra });
const ta = (name, label, max, extra = {}) => ({ name, label, type: 'textarea', max, required: true, ...extra });
const link = (name, label, extra = {}) => ({ name, label, type: 'link', max: 300, required: true, ...extra });
const img = (name, label, extra = {}) => ({ name, label, type: 'image', max: 500, required: true, ...extra });

const BLOCKS = [
  // ── Home page ──
  {
    key: 'home.hero', page: 'Home page', title: 'Hero',
    description: 'The full-screen poster at the top of the home page.',
    fields: [
      { name: 'headline', label: 'Headline lines', type: 'lines', maxLines: 4, max: 20, required: true, hint: 'One line per row (up to 4, 20 characters each). The big faded “Your” is part of the default photo.' },
      t('tagline', 'Sub-line', 90),
      t('priceLine', 'Price line', 90),
      t('buttonLabel', 'Button label', 30),
      link('buttonLink', 'Button link'),
      img('image', 'Hero photo', { hint: 'Wide photo; the headline sits over its right half. The default has “Your” baked in.' }),
      img('mobileImage', 'Phone hero photo', { hint: 'Tall photo (9:16) shown on phones; the copy sits at the top right, so keep that area plain.' }),
    ],
  },
  {
    key: 'home.heroNavratri', page: 'Home page', title: 'Navratri Hero Slide',
    description: 'Hero carousel slide for the Navratri "Pick Any 3 @ ₹999" promotion.',
    fields: [
      t('badge', 'Badge text', 40),
      { name: 'headline', label: 'Headline lines', type: 'lines', maxLines: 4, max: 20, required: true, hint: 'One line per row (up to 4, 20 characters each).' },
      t('tagline', 'Sub-line', 120),
      t('priceLine', 'Price line', 90),
      t('buttonLabel', 'Button label', 30),
      link('buttonLink', 'Button link'),
      img('image', 'Slide banner photo (wide)', { hint: 'Wide photo for desktop hero slider.' }),
      img('mobileImage', 'Phone slide banner photo', { hint: 'Tall photo for phones.' }),
    ],
  },
  {
    key: 'home.marquee', page: 'Home page', title: 'Scrolling strip',
    description: 'The yellow strip under the hero that scrolls sideways.',
    // One point per line; the strip shows them in order, a ✦ between each.
    // (A value saved before this was a single string — cleanField turns it
    // into a one-point list.)
    fields: [{ name: 'text', label: 'Points', type: 'lines', maxLines: 6, max: 80, required: true, hint: 'One point per line — the strip shows them in order with a ✦ between each, then repeats.' }],
  },
  {
    key: 'shared.budget', page: 'Home page', title: 'Jewellery, by budget',
    description: 'The three price cards. Shown on both the home page and the jewellery page. Prices (₹199+ / ₹499+ / ₹999+) and their links are fixed.',
    fields: [
      t('heading', 'Heading', 80),
      t('subheading', 'Sub-heading', 80),
      img('card1Image', '₹199+ card photo', { group: '₹199+ card' }),
      ta('card1Copy', '₹199+ card text', 120, { group: '₹199+ card' }),
      img('card2Image', '₹499+ card photo', { group: '₹499+ card' }),
      ta('card2Copy', '₹499+ card text', 120, { group: '₹499+ card' }),
      img('card3Image', '₹999+ card photo', { group: '₹999+ card' }),
      ta('card3Copy', '₹999+ card text', 120, { group: '₹999+ card' }),
      t('linkLabel', 'Link label', 30),
    ],
  },
  {
    key: 'home.brand', page: 'Home page', title: 'Brand statement',
    description: 'The big pink “For every version of you.” section over the floating photo wall.',
    fields: [
      t('headline', 'Headline', 60),
      ta('line1', 'Text — first sentence', 140),
      ta('line2', 'Text — second line', 120),
      t('buttonLabel', 'Button label', 30),
      link('buttonLink', 'Button link'),
    ],
  },
  {
    key: 'home.vibeBanner', page: 'Home page', title: 'Banner — “wear your vibe”',
    description: 'Full-width 16:9 banner; the phrase writes itself in script as it scrolls into view.',
    fields: [
      t('text', 'Script phrase', 40, { hint: 'Short and lowercase reads best in the script font.' }),
      img('image', 'Banner photo (16:9)'),
    ],
  },
  {
    key: 'home.under499', page: 'Home page', title: 'Under ₹499 edit',
    description: 'Product row of the cheapest pieces (filled automatically from the catalogue).',
    fields: [
      t('title', 'Title', 60),
      t('subtitle', 'Sub-title', 100),
      t('linkLabel', 'Link label', 30),
    ],
  },
  {
    key: 'home.posterBanner', page: 'Home page', title: 'Banner — “made for every you”',
    description: 'Second full-width 16:9 banner; the phrase sits low over a soft dark wash.',
    fields: [
      t('text', 'Script phrase', 40),
      img('image', 'Banner photo (16:9)'),
    ],
  },
  {
    key: 'home.follow', page: 'Home page', title: 'Follow the fits',
    description: 'Instagram reel strip section.',
    fields: [
      ta('description', 'Text', 160),
      t('note', 'Small print', 80),
    ],
  },
  {
    key: 'home.faq', page: 'Home page', title: 'FAQ heading',
    description: 'Heading block next to the FAQ list (questions themselves come from Customer care → FAQ).',
    fields: [
      t('heading', 'Heading', 30),
      t('lead', 'Lead line', 80),
      t('script', 'Script word', 24),
      t('stuckTitle', '“Still stuck?” title', 40),
      t('stuckText', '“Still stuck?” text', 80),
    ],
  },
  {
    key: 'home.newsletter', page: 'Home page', title: 'Newsletter',
    description: 'The teal “Be first in line…” sign-up panel near the bottom.',
    fields: [
      t('heading', 'Heading', 60),
      t('script', 'Script words', 24),
      ta('subtext', 'Sub-text', 160),
      t('buttonLabel', 'Button label', 24),
      t('doneTitle', 'Success title', 50),
      t('doneText', 'Success text', 100),
    ],
  },
  // ── Jewellery page ──
  {
    key: 'jewellery.hero', page: 'Jewellery page', title: 'Hero',
    description: 'The full-screen poster at the top of /jewellery.',
    fields: [
      { name: 'headline', label: 'Headline lines', type: 'lines', maxLines: 3, max: 22, required: true, hint: 'One line per row (up to 3, 22 characters each).' },
      ta('tagline', 'Sub-line', 120),
      t('primaryLabel', 'Main button label', 30, { group: 'Buttons' }),
      link('primaryLink', 'Main button link', { group: 'Buttons' }),
      t('secondaryLabel', 'Second button label', 30, { group: 'Buttons' }),
      link('secondaryLink', 'Second button link', { group: 'Buttons' }),
      img('image', 'Hero photo', { hint: 'The model sits on the left; the copy sits over the right half.' }),
    ],
  },
  {
    key: 'jewellery.trending', page: 'Jewellery page', title: 'Trending now',
    description: 'The fanned-out card section (cards come from the catalogue).',
    fields: [
      t('heading', 'Heading', 30),
      ta('caption', 'Caption', 120),
      t('buttonLabel', 'Button label', 30),
      link('buttonLink', 'Button link'),
    ],
  },
];

// Attach each field's default from the shared file (fail fast at start-up
// if the schema and the file ever drift apart).
for (const b of BLOCKS) {
  for (const f of b.fields) {
    const def = DEFAULTS[b.key]?.[f.name];
    if (def === undefined) throw new Error(`contentDefaults.json is missing ${b.key}.${f.name}`);
    f.default = def;
  }
}

const BY_KEY = Object.fromEntries(BLOCKS.map((b) => [b.key, b]));
const defaultsOf = (block) => Object.fromEntries(block.fields.map((f) => [f.name, f.default]));

// Unsafe characters for something that ends up in a CSS url("…") or href.
const URL_OK = /^(\/(?!\/)|https?:\/\/)[^\s"'()<>\\`]*$/i;

// Clean one field's value or throw a readable message.
function cleanField(f, raw) {
  if (f.type === 'lines') {
    const arr = (Array.isArray(raw) ? raw : String(raw ?? '').split('\n'))
      .map((s) => String(s ?? '').trim())
      .filter(Boolean);
    if (!arr.length) throw new Error(`${f.label} needs at least one line`);
    if (arr.length > f.maxLines) throw new Error(`${f.label}: at most ${f.maxLines} lines`);
    const long = arr.find((s) => s.length > f.max);
    if (long) throw new Error(`${f.label}: each line must be at most ${f.max} characters`);
    return arr;
  }
  if (raw != null && typeof raw !== 'string') throw new Error(`${f.label} must be text`);
  const s = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!s && f.required) throw new Error(`${f.label} is required`);
  if (s.length > f.max) throw new Error(`${f.label} must be at most ${f.max} characters`);
  if ((f.type === 'link' || f.type === 'image') && s && !URL_OK.test(s)) {
    throw new Error(f.type === 'image'
      ? `${f.label} must be an uploaded image or a site path like /banner1.jpg (or an https:// link)`
      : `${f.label} must start with / (a page on this site) or https://`);
  }
  return s;
}

// Validate a whole block; returns only the fields that differ from the
// defaults (the override to store). Unknown fields are rejected.
function cleanBlock(block, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Content must be an object of fields');
  const known = new Set(block.fields.map((f) => f.name));
  const unknown = Object.keys(input).filter((k) => !known.has(k));
  if (unknown.length) throw new Error(`Unknown field: ${unknown[0]}`);
  const out = {};
  for (const f of block.fields) {
    if (!(f.name in input)) continue; // missing → default
    const v = cleanField(f, input[f.name]);
    if (JSON.stringify(v) !== JSON.stringify(f.default)) out[f.name] = v;
  }
  return out;
}

// A stored override, re-checked against the current schema (so a field that
// was removed or tightened since it was saved never reaches the storefront).
function parseStored(block, json) {
  let raw;
  try { raw = JSON.parse(json); } catch { return {}; }
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const f of block.fields) {
    if (!(f.name in raw)) continue;
    try { out[f.name] = cleanField(f, raw[f.name]); } catch { /* fall back to the default */ }
  }
  return out;
}

// Blocks the admin may edit right now (Homepage & Banners). Every other
// block always shows its built-in copy — any override saved for it earlier
// is ignored (kept in the DB, so re-enabling a key here brings it back).
const EDITABLE_KEYS = ['home.hero', 'home.heroNavratri', 'home.marquee'];

async function loadOverrides() {
  const rows = await prisma.contentBlock.findMany({ where: { key: { in: EDITABLE_KEYS } } });
  return Object.fromEntries(rows.map((r) => [r.key, { value: parseStored(BY_KEY[r.key], r.value), updatedAt: r.updatedAt }]));
}

// GET /api/content — public: every stored override as { key: { field: value } }.
// The storefront merges these over its built-in defaults.
router.get('/', async (req, res) => {
  try {
    const overrides = await loadOverrides();
    const out = {};
    for (const [key, { value }] of Object.entries(overrides)) if (Object.keys(value).length) out[key] = value;
    res.set('Cache-Control', 'no-store');
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
module.exports.BLOCKS = BLOCKS;
module.exports.BY_KEY = BY_KEY;
module.exports.defaultsOf = defaultsOf;
module.exports.cleanBlock = cleanBlock;
module.exports.loadOverrides = loadOverrides;
module.exports.EDITABLE_KEYS = EDITABLE_KEYS;
module.exports.prisma = prisma;
