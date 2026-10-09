const router = require('express').Router();
const { generateUniqueSlug, slugify } = require('../../lib/slug');
const { logActivity } = require('../../lib/adminPermissions');
const { lowStockProducts, alertRecipients } = require('../../lib/alerts');
const settings = require('../../lib/settings');

const prisma = require('../../lib/prisma');

// Reports & Exports (growth). Mounted at /api/admin/reports behind
// adminAuth + 'reports' permission.
//   GET  /summary?range=…            sales report for a date range
//   GET  /inventory                  low / out-of-stock products
//   GET  /export/orders.csv?range=…  CSV (UTF-8 + BOM so Excel shows ₹)
//   GET  /export/customers.csv
//   GET  /export/products.csv
//   GET  /import/template.csv        bulk product import template
//   POST /import/products { rows, dryRun }   create / update products by slug
//
// range = today | 7d | 30d | 90d | month | lastmonth | year | custom (&from=YYYY-MM-DD&to=YYYY-MM-DD)
// Days are Indian Standard Time. "Real" orders only (COD, or online + paid);
// revenue excludes CANCELLED orders.
const REAL = { OR: [{ paymentMethod: 'COD' }, { paymentStatus: 'PAID' }] };
const DAY = 864e5;
const IST = 330 * 60 * 1000;

const istDate = (d) => new Date(new Date(d).getTime() + IST).toISOString().slice(0, 10);
const istStart = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d) - IST); };
const addDays = (date, n) => new Date(date.getTime() + n * DAY);
const validYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && istDate(istStart(s)) === s;
const fmtDay = (ymd) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });

const RANGE_LABELS = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', month: 'This month', lastmonth: 'Last month', year: 'This year' };

// → { key, from, to (exclusive), label, fromYmd, toYmd } or throws Error(message).
function parseRange(q) {
  const key = String(q.range || '30d');
  const today = istDate(new Date());
  const todayStart = istStart(today);
  const tomorrow = addDays(todayStart, 1);
  const [y, m] = today.split('-').map(Number);
  let from;
  let to = tomorrow;
  switch (key) {
    case 'today': from = todayStart; break;
    case '7d': from = addDays(todayStart, -6); break;
    case '30d': from = addDays(todayStart, -29); break;
    case '90d': from = addDays(todayStart, -89); break;
    case 'month': from = istStart(`${y}-${String(m).padStart(2, '0')}-01`); break;
    case 'lastmonth': {
      const py = m === 1 ? y - 1 : y;
      const pm = m === 1 ? 12 : m - 1;
      from = istStart(`${py}-${String(pm).padStart(2, '0')}-01`);
      to = istStart(`${y}-${String(m).padStart(2, '0')}-01`);
      break;
    }
    case 'year': from = istStart(`${y}-01-01`); break;
    case 'custom': {
      if (!validYmd(q.from) || !validYmd(q.to)) throw new Error('Pick a valid start and end date.');
      if (q.from > q.to) throw new Error('The start date must be on or before the end date.');
      from = istStart(q.from);
      to = addDays(istStart(q.to), 1);
      if (to - from > 3 * 366 * DAY) throw new Error('Pick a range of at most 3 years.');
      break;
    }
    default: throw new Error('Unknown date range.');
  }
  const fromYmd = istDate(from);
  const toYmd = istDate(addDays(to, -1));
  const label = key === 'custom' ? (fromYmd === toYmd ? fmtDay(fromYmd) : `${fmtDay(fromYmd)} – ${fmtDay(toYmd)}`) : RANGE_LABELS[key];
  return { key, from, to, label, fromYmd, toYmd };
}

const inRange = (r) => ({ createdAt: { gte: r.from, lt: r.to } });
const splitTags = (s) => String(s || '').split(',').map((t) => t.trim()).filter(Boolean);
const methodLabel = (m) => (m === 'COD' ? 'Cash on delivery' : m === 'CREDITS' ? 'ZUNUZ Credits' : 'Online (Razorpay)');

// ── Sales summary ──
router.get('/summary', async (req, res) => {
  let r;
  try { r = parseRange(req.query); } catch (e) { return res.status(400).json({ error: e.message }); }
  try {
    const span = r.to - r.from;
    const prevRange = { from: new Date(r.from.getTime() - span), to: r.from };
    const [orders, prevAgg] = await Promise.all([
      prisma.order.findMany({
        where: { AND: [REAL, inRange(r)] },
        select: {
          id: true, total: true, status: true, paymentMethod: true, discount: true, couponCode: true,
          refundStatus: true, refundAmount: true, createdAt: true, customerId: true,
          customer: { select: { id: true, name: true, email: true } },
          items: { select: { productId: true, quantity: true, price: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.order.aggregate({ _sum: { total: true }, _count: { _all: true }, where: { AND: [REAL, inRange(prevRange), { status: { not: 'CANCELLED' } }] } }),
    ]);
    const live = orders.filter((o) => o.status !== 'CANCELLED');

    const productIds = [...new Set(live.flatMap((o) => o.items.map((i) => i.productId)))];
    const products = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, image: true, slug: true, category: { select: { id: true, name: true } } } })
      : [];
    const pById = new Map(products.map((p) => [p.id, p]));

    const revenue = live.reduce((s, o) => s + o.total, 0);
    const itemsSold = live.reduce((s, o) => s + o.items.reduce((n, i) => n + i.quantity, 0), 0);
    const discounts = live.reduce((s, o) => s + (o.discount || 0), 0);
    const refunded = orders.filter((o) => o.refundStatus === 'PROCESSED').reduce((s, o) => s + (o.refundAmount || 0), 0);

    // Revenue series: daily up to ~3 months, monthly beyond.
    const days = Math.round(span / DAY);
    const granularity = days <= 92 ? 'day' : 'month';
    const buckets = new Map();
    if (granularity === 'day') {
      for (let d = r.from; d < r.to; d = addDays(d, 1)) {
        const ymd = istDate(d);
        buckets.set(ymd, { key: ymd, label: new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short' }), revenue: 0, orders: 0 });
      }
    } else {
      for (let d = r.from; d < r.to; d = addDays(d, 1)) {
        const ym = istDate(d).slice(0, 7);
        if (!buckets.has(ym)) buckets.set(ym, { key: ym, label: new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', month: 'short', year: '2-digit' }), revenue: 0, orders: 0 });
      }
    }
    live.forEach((o) => {
      const k = granularity === 'day' ? istDate(o.createdAt) : istDate(o.createdAt).slice(0, 7);
      const b = buckets.get(k);
      if (b) { b.revenue += o.total; b.orders += 1; }
    });

    // Sales by product / category (item value before order-level discounts).
    const byProduct = new Map();
    const byCategory = new Map();
    live.forEach((o) => o.items.forEach((i) => {
      const p = pById.get(i.productId);
      const v = i.quantity * i.price;
      const cur = byProduct.get(i.productId) || { id: i.productId, name: p?.name || `Product #${i.productId}`, image: p?.image || null, slug: p?.slug || null, category: p?.category?.name || null, qty: 0, revenue: 0, orders: 0 };
      cur.qty += i.quantity; cur.revenue += v; cur.orders += 1;
      byProduct.set(i.productId, cur);
      const ck = p?.category?.id ?? 0;
      const cc = byCategory.get(ck) || { id: ck, name: p?.category?.name || 'Uncategorised', qty: 0, revenue: 0 };
      cc.qty += i.quantity; cc.revenue += v;
      byCategory.set(ck, cc);
    }));
    const itemsValue = [...byProduct.values()].reduce((s, p) => s + p.revenue, 0);

    const byMethod = { COD: { method: 'COD', label: methodLabel('COD'), orders: 0, revenue: 0 }, RAZORPAY: { method: 'RAZORPAY', label: methodLabel('RAZORPAY'), orders: 0, revenue: 0 } };
    live.forEach((o) => { const m = byMethod[o.paymentMethod]; if (m) { m.orders += 1; m.revenue += o.total; } });

    const byCustomer = new Map();
    live.forEach((o) => {
      const c = byCustomer.get(o.customerId) || { id: o.customerId, name: o.customer?.name || null, email: o.customer?.email || null, orders: 0, revenue: 0 };
      c.orders += 1; c.revenue += o.total;
      byCustomer.set(o.customerId, c);
    });

    const byCoupon = new Map();
    live.filter((o) => o.couponCode).forEach((o) => {
      const k = o.couponCode.toUpperCase();
      const c = byCoupon.get(k) || { code: k, uses: 0, discount: 0, revenue: 0 };
      c.uses += 1; c.discount += o.discount || 0; c.revenue += o.total;
      byCoupon.set(k, c);
    });

    res.json({
      range: { key: r.key, label: r.label, from: r.fromYmd, to: r.toYmd },
      summary: {
        revenue,
        orders: live.length,
        cancelled: orders.length - live.length,
        avgOrder: live.length ? Math.round(revenue / live.length) : 0,
        itemsSold,
        discounts,
        discountedOrders: live.filter((o) => o.discount > 0).length,
        refunded,
        refundedOrders: orders.filter((o) => o.refundStatus === 'PROCESSED').length,
        customers: byCustomer.size,
        previous: { revenue: prevAgg._sum.total || 0, orders: prevAgg._count._all || 0 },
      },
      series: { granularity, points: [...buckets.values()] },
      products: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue || b.qty - a.qty),
      itemsValue,
      categories: [...byCategory.values()].sort((a, b) => b.revenue - a.revenue),
      payments: Object.values(byMethod),
      topCustomers: [...byCustomer.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      coupons: [...byCoupon.values()].sort((a, b) => b.uses - a.uses || b.discount - a.discount),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Inventory (for the low-stock section) ──
router.get('/inventory', async (req, res) => {
  try {
    const { threshold, products } = await lowStockProducts();
    const s = settings.get();
    res.json({
      threshold,
      products,
      alerts: { enabled: !!s.lowStockAlerts, recipients: alertRecipients(), fallback: req.adminAccess?.email || null },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CSV ──
// Quote when needed; neutralise spreadsheet formulas in text cells.
function cell(v) {
  if (v == null) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function sendCsv(res, filename, header, rows) {
  const body = [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  });
  res.send(`\uFEFF${body}\r\n`);
}
const csvDate = (d) => (d ? new Date(new Date(d).getTime() + IST).toISOString().slice(0, 16).replace('T', ' ') : '');
const stamp = () => istDate(new Date());

function logExport(req, summary) {
  logActivity({ admin: req.adminAccess, action: 'EXPORT', section: 'reports', summary, ip: req.ip });
}

router.get('/export/orders.csv', async (req, res) => {
  let r;
  try { r = parseRange(req.query); } catch (e) { return res.status(400).json({ error: e.message }); }
  try {
    const orders = await prisma.order.findMany({
      where: { AND: [REAL, inRange(r)] },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        address: true,
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const header = ['Order ID', 'Date (IST)', 'Customer', 'Email', 'Phone', 'Items', 'Items total (₹)', 'Discount (₹)', 'Coupon', 'Delivery (₹)', 'Total (₹)', 'Payment method', 'Payment status', 'Status', 'Courier', 'Tracking number', 'Refund status', 'Refund amount (₹)', 'Address'];
    const rows = orders.map((o) => {
      const itemsTotal = o.items.reduce((s, i) => s + i.quantity * i.price, 0);
      const delivery = Math.max(0, o.total - (itemsTotal - (o.discount || 0)));
      const a = o.address || {};
      return [
        o.id, csvDate(o.createdAt), o.customer?.name || a.name || '', o.customer?.email || a.email || '', o.customer?.phone || a.phone || '',
        o.items.map((i) => `${i.product?.name || `#${i.productId}`} ×${i.quantity}`).join('; '),
        itemsTotal, o.discount || 0, o.couponCode || '', delivery, o.total,
        methodLabel(o.paymentMethod), o.paymentStatus, o.status, o.courier || '', o.trackingNumber || '',
        o.refundStatus || '', o.refundAmount ?? '',
        [a.name, a.houseNo, a.street, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', '),
      ];
    });
    logExport(req, `Exported ${orders.length} order${orders.length === 1 ? '' : 's'} to CSV (${r.label})`);
    sendCsv(res, `zunuz-orders-${r.fromYmd}-to-${r.toYmd}.csv`, header, rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/customers.csv', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      select: { id: true, name: true, email: true, phone: true, createdAt: true, tags: true, orders: { where: REAL, select: { total: true, status: true } } },
      orderBy: { id: 'asc' },
    });
    const header = ['Customer ID', 'Name', 'Email', 'Phone', 'Joined (IST)', 'Orders', 'Total spent (₹)', 'Tags'];
    const rows = customers.map((c) => [
      c.id, c.name || '', c.email || '', c.phone || '', csvDate(c.createdAt), c.orders.length,
      c.orders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0),
      splitTags(c.tags).join(', '),
    ]);
    logExport(req, `Exported ${customers.length} customer${customers.length === 1 ? '' : 's'} to CSV`);
    sendCsv(res, `zunuz-customers-${stamp()}.csv`, header, rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Columns shared by the product export and the import template, so an
// export can be edited and imported straight back.
const PRODUCT_COLUMNS = ['name', 'slug', 'category', 'type', 'price', 'stock', 'active', 'image', 'images', 'tagline', 'description', 'materials', 'product_details', 'why_worth_it', 'care_instructions'];
const parseImages = (raw) => { try { const a = JSON.parse(raw || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };

router.get('/export/products.csv', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ include: { category: true, subcategory: true }, orderBy: { id: 'asc' } });
    const rows = products.map((p) => [
      p.id, p.name, p.slug || '', p.category?.slug || '', p.subcategory?.slug || '', p.price, p.stock, p.isActive ? 'yes' : 'no',
      p.image || '', parseImages(p.images).join(' | '), p.tagline || '', p.description || '', p.materials || '',
      p.productDetails || '', p.whyWorthIt || '', p.careInstructions || '',
    ]);
    logExport(req, `Exported ${products.length} product${products.length === 1 ? '' : 's'} to CSV`);
    sendCsv(res, `zunuz-products-${stamp()}.csv`, ['id', ...PRODUCT_COLUMNS], rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/import/template.csv', async (req, res) => {
  try {
    const [cat, sub] = await Promise.all([
      prisma.category.findFirst({ orderBy: { order: 'asc' } }),
      prisma.subcategory.findFirst({ orderBy: { order: 'asc' } }),
    ]);
    sendCsv(res, 'zunuz-product-import-template.csv', PRODUCT_COLUMNS, [[
      'Example Pearl Drop Earrings', '', cat?.slug || 'earrings', sub?.slug || 'everyday', 1299, 10, 'yes',
      '/uploads/example.webp', 'https://example.com/photo-2.jpg | /uploads/photo-3.webp', 'Light, everyday sparkle',
      'Delicate freshwater-style pearls on a gold-tone hook.', '', '', '', '',
    ]]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Categories + types the import accepts (for the import screen).
router.get('/import/meta', async (req, res) => {
  try {
    const [categories, subcategories] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true, slug: true }, orderBy: { order: 'asc' } }),
      prisma.subcategory.findMany({ select: { id: true, name: true, slug: true }, orderBy: { order: 'asc' } }),
    ]);
    res.json({ categories, subcategories, columns: PRODUCT_COLUMNS, canImport: !!req.adminAccess?.permissions?.includes('products') });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Bulk product import ──
const MAX_ROWS = 200; // per request (the client sends large files in batches)
const TEXT_FIELDS = { tagline: 'tagline', description: 'description', materials: 'materials', product_details: 'productDetails', why_worth_it: 'whyWorthIt', care_instructions: 'careInstructions' };
const isImageRef = (s) => /^https?:\/\/\S+$/i.test(s) || /^\/\S+$/.test(s);
const blank = (v) => v == null || String(v).trim() === '';

function parseNumber(v, label, errors, { min = 0, max = 10000000 } = {}) {
  const s = String(v).replace(/[₹,\s]/g, '').replace(/^rs\.?/i, '');
  const n = Number(s);
  if (!s || !Number.isFinite(n) || !Number.isInteger(n)) { errors.push(`${label} must be a whole number`); return undefined; }
  if (n < min || n > max) { errors.push(`${label} must be between ${min.toLocaleString('en-IN')} and ${max.toLocaleString('en-IN')}`); return undefined; }
  return n;
}
function parseBool(v, errors) {
  const s = String(v).trim().toLowerCase();
  if (['yes', 'y', 'true', '1', 'active', 'on'].includes(s)) return true;
  if (['no', 'n', 'false', '0', 'inactive', 'hidden', 'off'].includes(s)) return false;
  errors.push('Active must be yes or no');
  return undefined;
}

router.post('/import/products', async (req, res) => {
  if (!req.adminAccess?.permissions?.includes('products')) {
    return res.status(403).json({ error: 'Importing products also needs the Products permission.' });
  }
  const { rows, dryRun = true } = req.body || {};
  if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ error: 'No rows to import.' });
  if (rows.length > MAX_ROWS) return res.status(400).json({ error: `Send at most ${MAX_ROWS} rows per request.` });
  if (dryRun) res.locals.skipActivity = true;
  try {
    const [categories, subcategories] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true, slug: true } }),
      prisma.subcategory.findMany({ select: { id: true, name: true, slug: true } }),
    ]);
    const find = (list, v) => {
      const s = String(v).trim().toLowerCase();
      return list.find((x) => x.slug.toLowerCase() === s) || list.find((x) => x.name.trim().toLowerCase() === s) || list.find((x) => x.slug === slugify(s));
    };
    const slugs = rows.map((r) => (blank(r?.slug) ? null : slugify(r.slug))).filter(Boolean);
    const existing = slugs.length ? await prisma.product.findMany({ where: { slug: { in: slugs } } }) : [];
    const bySlug = new Map(existing.map((p) => [p.slug, p]));
    const seenSlugs = new Set();
    const results = [];
    let created = 0;
    let updated = 0;
    let failed = 0;

    for (let idx = 0; idx < rows.length; idx += 1) {
      const raw = rows[idx] && typeof rows[idx] === 'object' ? rows[idx] : {};
      const rowNo = Number(raw.__row) || idx + 1;
      const errors = [];
      const slug = blank(raw.slug) ? null : slugify(raw.slug);
      if (!blank(raw.slug) && !slug) errors.push('Slug has no usable letters or numbers');
      if (slug) {
        if (seenSlugs.has(slug)) errors.push('The same slug appears more than once in this file');
        seenSlugs.add(slug);
      }
      const match = slug ? bySlug.get(slug) : null;
      const isUpdate = !!match;
      const data = {};

      if (!blank(raw.name)) {
        const name = String(raw.name).trim();
        if (name.length > 191) errors.push('Name is too long (max 191 characters)');
        else data.name = name;
      } else if (!isUpdate) errors.push('Name is required');

      if (!blank(raw.category)) {
        const c = find(categories, raw.category);
        if (c) data.categoryId = c.id; else errors.push(`Unknown category “${String(raw.category).trim()}”`);
      } else if (!isUpdate) errors.push('Category is required');

      if (!blank(raw.type)) {
        const t = find(subcategories, raw.type);
        if (t) data.subcategoryId = t.id; else errors.push(`Unknown type “${String(raw.type).trim()}”`);
      } else if (!isUpdate) errors.push('Type is required');

      if (!blank(raw.price)) { const n = parseNumber(raw.price, 'Price', errors, { min: 1 }); if (n !== undefined) data.price = n; }
      else if (!isUpdate) errors.push('Price is required');

      if (!blank(raw.stock)) { const n = parseNumber(raw.stock, 'Stock', errors, { min: 0, max: 1000000 }); if (n !== undefined) data.stock = n; }
      else if (!isUpdate) data.stock = 0;

      if (!blank(raw.active)) { const b = parseBool(raw.active, errors); if (b !== undefined) data.isActive = b; }
      else if (!isUpdate) data.isActive = true;

      if (!blank(raw.image)) {
        const img = String(raw.image).trim();
        if (!isImageRef(img) || img.length > 191) errors.push('Image must be a full https:// URL or a path starting with /');
        else data.image = img;
      } else if (!isUpdate) errors.push('Image is required');

      if (!blank(raw.images)) {
        const list = String(raw.images).split(/\s*[|\n]\s*/).map((s) => s.trim()).filter(Boolean);
        const bad = list.filter((s) => !isImageRef(s));
        if (bad.length) errors.push(`Extra image “${bad[0].slice(0, 60)}” must be a URL or a path starting with /`);
        else data.images = JSON.stringify(list);
      }

      Object.entries(TEXT_FIELDS).forEach(([col, field]) => {
        if (blank(raw[col])) return;
        const v = String(raw[col]).replace(/\r\n/g, '\n').trim();
        if (field === 'tagline' && v.length > 191) errors.push('Tagline is too long (max 191 characters)');
        else data[field] = v;
      });

      const base = { row: rowNo, name: data.name || match?.name || String(raw.name || '').trim() || null };
      if (errors.length) {
        failed += 1;
        results.push({ ...base, action: 'error', slug: slug || null, errors });
        continue;
      }

      if (isUpdate) {
        const changes = Object.keys(data).filter((k) => String(match[k] ?? '') !== String(data[k] ?? ''));
        if (!changes.length) { results.push({ ...base, action: 'unchanged', id: match.id, slug: match.slug, changes }); continue; }
        if (!dryRun) {
          try {
            await prisma.product.update({ where: { id: match.id }, data });
          } catch (e) {
            failed += 1;
            results.push({ ...base, action: 'error', slug: match.slug, errors: [`Could not save: ${e.message.split('\n').pop().slice(0, 140)}`] });
            continue;
          }
        }
        updated += 1;
        results.push({ ...base, action: 'update', id: match.id, slug: match.slug, changes });
      } else {
        let newSlug = slug;
        if (!dryRun) {
          try {
            newSlug = await generateUniqueSlug(prisma, slug || data.name);
            const p = await prisma.product.create({ data: { images: '[]', ...data, slug: newSlug } });
            created += 1;
            results.push({ ...base, action: 'create', id: p.id, slug: p.slug });
          } catch (e) {
            failed += 1;
            results.push({ ...base, action: 'error', slug: newSlug, errors: [`Could not save: ${e.message.split('\n').pop().slice(0, 140)}`] });
          }
          continue;
        }
        created += 1;
        results.push({ ...base, action: 'create', slug: slug || slugify(data.name) || null });
      }
    }

    if (!dryRun) {
      if (!created && !updated) res.locals.skipActivity = true;
      res.locals.activitySummary = `Imported products from CSV: ${created} created, ${updated} updated${failed ? `, ${failed} failed` : ''}`;
    }
    res.json({ dryRun: !!dryRun, created, updated, failed, unchanged: results.filter((x) => x.action === 'unchanged').length, results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
