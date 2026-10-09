// Admin alert emails (lib/alerts.js): "new order" and the daily low-stock
// digest. Plain, light, table-based HTML so it renders in every mail client.
// Every value that came from a customer or admin is HTML-escaped.

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// Absolute image URL for emails: relative paths are storefront assets; admin
// uploads are .webp with a .jpg twin (better email-client support).
function imageUrl(src, base) {
  if (!src) return `${base}/placeholder.png`;
  const abs = /^https?:\/\//i.test(src) ? src : `${base}${src.startsWith('/') ? '' : '/'}${src}`;
  return abs.endsWith('.webp') ? abs.replace(/\.webp$/, '.jpg') : abs;
}

function shell({ heading, intro, body, cta, footer }) {
  return `
<div style="background:#f6f3ee;padding:24px 12px;font-family:${FONT};">
  <table cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #ebe5da;border-collapse:separate;overflow:hidden;">
    <tr><td style="background:#111110;padding:18px 24px;">
      <span style="font-size:18px;font-weight:bold;letter-spacing:0.18em;color:#F6C915;">ZUNUZ</span>
      <span style="font-size:11px;font-weight:bold;letter-spacing:0.2em;color:#a1a1aa;margin-left:8px;">ADMIN ALERT</span>
    </td></tr>
    <tr><td style="padding:26px 24px 8px 24px;">
      <h1 style="margin:0 0 6px 0;font-size:21px;line-height:1.3;color:#111110;">${heading}</h1>
      ${intro ? `<p style="margin:0;font-size:14px;line-height:1.6;color:#5f5b53;">${intro}</p>` : ''}
    </td></tr>
    <tr><td style="padding:12px 24px 8px 24px;">${body}</td></tr>
    ${cta ? `<tr><td style="padding:12px 24px 26px 24px;">
      <a href="${esc(cta.href)}" style="display:inline-block;background:#FF3D8B;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:10px;">${esc(cta.label)}</a>
    </td></tr>` : ''}
  </table>
  <p style="max-width:600px;margin:14px auto 0 auto;font-size:12px;line-height:1.6;color:#8a847a;text-align:center;">${footer || 'You receive this because your address is set as the alert email in ZUNUZ admin → Settings.'}</p>
</div>`;
}

function row(label, value) {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#7a756b;width:130px;vertical-align:top;">${esc(label)}</td>
    <td style="padding:6px 0;font-size:14px;color:#111110;vertical-align:top;">${value}</td>
  </tr>`;
}

// order: { id, total, discount, couponCode, paymentMethod, paymentStatus, createdAt,
//          customer{name,email,phone}, address{…}, items[{quantity, price, product{name,image}}] }
function newOrderAlertEmail(order, base) {
  const items = order.items || [];
  const itemsTotal = items.reduce((s, it) => s + it.quantity * it.price, 0);
  const discount = Number(order.discount) || 0;
  const delivery = Math.max(0, order.total - (itemsTotal - discount));
  const a = order.address || {};
  const c = order.customer || {};
  const method = order.paymentMethod === 'COD' ? 'Cash on delivery' : order.paymentMethod === 'CREDITS' ? 'Paid with ZUNUZ Credits' : `Online (Razorpay) · ${order.paymentStatus === 'PAID' ? 'paid' : String(order.paymentStatus || '').toLowerCase()}`;
  const addressLine = [a.houseNo, a.street, a.landmark ? `near ${a.landmark}` : '', a.city, a.state, a.pincode].filter(Boolean).join(', ');
  const placed = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const itemRows = items.map((it) => `
    <tr>
      <td width="56" style="padding:10px 0;border-top:1px solid #f0ebe2;vertical-align:middle;">
        <img src="${esc(imageUrl(it.product?.image, base))}" width="46" height="46" alt="" style="display:block;border-radius:8px;border:1px solid #ebe5da;object-fit:cover;" />
      </td>
      <td style="padding:10px 0 10px 10px;border-top:1px solid #f0ebe2;font-size:14px;color:#111110;vertical-align:middle;">
        <b>${esc(it.product?.name || `Product #${it.productId}`)}</b><br/>
        <span style="font-size:12px;color:#7a756b;">${it.quantity} × ${inr(it.price)}</span>
      </td>
      <td align="right" style="padding:10px 0;border-top:1px solid #f0ebe2;font-size:14px;font-weight:bold;color:#111110;vertical-align:middle;white-space:nowrap;">${inr(it.quantity * it.price)}</td>
    </tr>`).join('');

  const totals = `
    <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-top:4px;">
      <tr><td style="padding:4px 0;font-size:13px;color:#7a756b;">Items</td><td align="right" style="padding:4px 0;font-size:13px;color:#111110;">${inr(itemsTotal)}</td></tr>
      ${discount ? `<tr><td style="padding:4px 0;font-size:13px;color:#7a756b;">Discount${order.couponCode ? ` (${esc(order.couponCode)})` : ''}</td><td align="right" style="padding:4px 0;font-size:13px;color:#15803d;">−${inr(discount)}</td></tr>` : ''}
      <tr><td style="padding:4px 0;font-size:13px;color:#7a756b;">Delivery</td><td align="right" style="padding:4px 0;font-size:13px;color:#111110;">${delivery ? inr(delivery) : 'Free'}</td></tr>
      <tr><td style="padding:8px 0 0 0;font-size:15px;font-weight:bold;color:#111110;border-top:1px solid #ebe5da;">Total</td><td align="right" style="padding:8px 0 0 0;font-size:15px;font-weight:bold;color:#111110;border-top:1px solid #ebe5da;">${inr(order.total)}</td></tr>
    </table>`;

  const body = `
    <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">${itemRows}</table>
    ${totals}
    <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-top:20px;">
      ${row('Customer', `${esc(c.name || a.name || '—')}${c.email ? `<br/><span style="color:#5f5b53;">${esc(c.email)}</span>` : ''}${(c.phone || a.phone) ? `<br/><span style="color:#5f5b53;">+91 ${esc(c.phone || a.phone)}</span>` : ''}`)}
      ${row('Payment', esc(method))}
      ${row('Ship to', `${a.name ? `${esc(a.name)}${a.phone ? ` · +91 ${esc(a.phone)}` : ''}<br/>` : ''}${esc(addressLine) || '—'}`)}
      ${row('Placed', esc(placed))}
    </table>`;

  const itemCount = items.reduce((n, it) => n + it.quantity, 0);
  const subject = `New order #${order.id} — ${inr(order.total)}`;
  const html = shell({
    heading: `New order #${order.id} · ${inr(order.total)}`,
    intro: `${esc(c.name || a.name || 'A customer')} ordered ${itemCount} item${itemCount === 1 ? '' : 's'} (${esc(order.paymentMethod === 'COD' ? 'cash on delivery' : order.paymentMethod === 'CREDITS' ? 'paid with ZUNUZ Credits' : 'paid online')}).`,
    body,
    cta: { href: `${base}/admin/orders`, label: 'Open orders' },
  });
  const text = [
    `New order #${order.id} — ${inr(order.total)}`,
    '',
    ...items.map((it) => `• ${it.product?.name || `Product #${it.productId}`} — ${it.quantity} × ${inr(it.price)}`),
    '',
    discount ? `Discount${order.couponCode ? ` (${order.couponCode})` : ''}: −${inr(discount)}` : null,
    `Delivery: ${delivery ? inr(delivery) : 'Free'}`,
    `Total: ${inr(order.total)}`,
    '',
    `Customer: ${c.name || a.name || '—'}${c.email ? ` <${c.email}>` : ''}${(c.phone || a.phone) ? ` · +91 ${c.phone || a.phone}` : ''}`,
    `Payment: ${method}`,
    `Ship to: ${addressLine || '—'}`,
    `Placed: ${placed}`,
    '',
    `Open orders: ${base}/admin/orders`,
  ].filter((l) => l !== null).join('\n');
  return { subject, html, text };
}

// products: [{ id, name, stock, image, price, category{name} }]
function lowStockAlertEmail(products, threshold, base) {
  const out = products.filter((p) => p.stock <= 0);
  const low = products.filter((p) => p.stock > 0);
  const rows = products.map((p) => `
    <tr>
      <td width="52" style="padding:9px 0;border-top:1px solid #f0ebe2;vertical-align:middle;">
        <img src="${esc(imageUrl(p.image, base))}" width="42" height="42" alt="" style="display:block;border-radius:8px;border:1px solid #ebe5da;object-fit:cover;" />
      </td>
      <td style="padding:9px 0 9px 10px;border-top:1px solid #f0ebe2;font-size:14px;color:#111110;vertical-align:middle;">
        <b>${esc(p.name)}</b><br/><span style="font-size:12px;color:#7a756b;">${esc(p.category?.name || '')}${p.category?.name ? ' · ' : ''}${inr(p.price)}</span>
      </td>
      <td align="right" style="padding:9px 0;border-top:1px solid #f0ebe2;font-size:13px;font-weight:bold;vertical-align:middle;white-space:nowrap;color:${p.stock <= 0 ? '#dc2626' : '#b45309'};">
        ${p.stock <= 0 ? 'Out of stock' : `${p.stock} left`}
      </td>
    </tr>`).join('');

  const subject = out.length
    ? `Stock alert: ${out.length} out of stock${low.length ? `, ${low.length} running low` : ''}`
    : `Stock alert: ${low.length} product${low.length === 1 ? '' : 's'} running low`;
  const html = shell({
    heading: 'Products that need restocking',
    intro: `${out.length} out of stock and ${low.length} with ${threshold} or fewer left. Active products only.`,
    body: `<table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">${rows}</table>`,
    cta: { href: `${base}/admin/products`, label: 'Open products' },
  });
  const text = [
    'Products that need restocking',
    `${out.length} out of stock · ${low.length} with ${threshold} or fewer left`,
    '',
    ...products.map((p) => `• ${p.name} — ${p.stock <= 0 ? 'OUT OF STOCK' : `${p.stock} left`}`),
    '',
    `Open products: ${base}/admin/products`,
  ].join('\n');
  return { subject, html, text };
}

module.exports = { newOrderAlertEmail, lowStockAlertEmail, esc, inr, imageUrl };
