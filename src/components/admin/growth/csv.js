// CSV helpers for the admin growth pages (Reports, Products import/export).
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Download a file from an admin API endpoint (JSON api helper can't do blobs).
export async function downloadAdminFile(path, fallbackName = 'export.csv') {
  const token = localStorage.getItem('zunuz_admin_token');
  const res = await fetch(`${BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (res.status === 401) {
    localStorage.removeItem('zunuz_admin_token');
    window.location.replace('/admin/login?expired=1');
    throw new Error('Your session expired.');
  }
  if (!res.ok) {
    let msg = 'Download failed';
    try { msg = (await res.json()).error || msg; } catch { /* not JSON */ }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// RFC 4180-ish parser: quoted fields, "" escapes, commas/newlines inside
// quotes, CRLF or LF line ends, optional UTF-8 BOM. Returns string[][].
export function parseCsv(text) {
  const s = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
      } else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// Header aliases → import field keys.
const ALIASES = {
  name: 'name', productname: 'name', title: 'name',
  slug: 'slug',
  category: 'category', maincategory: 'category',
  type: 'type', subcategory: 'type', producttype: 'type',
  price: 'price', priceinr: 'price', 'price₹': 'price',
  stock: 'stock', quantity: 'stock', qty: 'stock',
  active: 'active', isactive: 'active', visible: 'active', status: 'active',
  image: 'image', mainimage: 'image', imageurl: 'image',
  images: 'images', extraimages: 'images', moreimages: 'images',
  tagline: 'tagline', description: 'description', materials: 'materials',
  productdetails: 'product_details', details: 'product_details',
  whyworthit: 'why_worth_it', whyitsworthit: 'why_worth_it',
  careinstructions: 'care_instructions', productcare: 'care_instructions', care: 'care_instructions',
};
const norm = (h) => String(h || '').toLowerCase().replace(/[^a-z0-9₹]/g, '');

// string[][] → { rows: [{ __row, name, slug, … }], unknown: [header], missing: [key] }
export function rowsToProducts(table) {
  if (!table.length) return { rows: [], unknown: [], missing: ['name'] };
  const [header, ...body] = table;
  const keys = header.map((h) => ALIASES[norm(h)] || null);
  const unknown = header.filter((h, i) => !keys[i] && norm(h) && norm(h) !== 'id');
  const missing = ['name'].filter((k) => !keys.includes(k));
  const rows = body.map((cells, i) => {
    const r = { __row: i + 2 }; // spreadsheet row number (header is row 1)
    keys.forEach((k, j) => { if (k && cells[j] != null && r[k] === undefined) r[k] = cells[j].trim(); });
    return r;
  });
  return { rows, unknown, missing };
}

// Split rows into request batches that stay well under the API's JSON size limit.
export function batches(rows, maxRows = 150, maxBytes = 80_000) {
  const out = [];
  let cur = [];
  let size = 0;
  rows.forEach((r) => {
    const n = JSON.stringify(r).length;
    if (cur.length && (cur.length >= maxRows || size + n > maxBytes)) { out.push(cur); cur = []; size = 0; }
    cur.push(r); size += n;
  });
  if (cur.length) out.push(cur);
  return out;
}
