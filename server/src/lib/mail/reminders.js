// Customer email: "you left something behind" for an online checkout that
// was never paid (admin Abandoned Checkouts page). Warm, short, one button.
const { esc, inr, imageUrl } = require('./alerts');

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// order: { id, total, items[{ quantity, price, product{ name, image, slug, id, isActive } }], customer{name}, address{name} }
function checkoutReminderEmail(order, base, { supportEmail } = {}) {
  const items = order.items || [];
  const firstName = String(order.customer?.name || order.address?.name || '').trim().split(/\s+/)[0] || 'there';
  const productUrl = (p) => (p?.slug ? `${base}/products/${encodeURIComponent(p.slug)}` : `${base}/jewellery`);
  const single = items.length === 1 && items[0].product?.slug;
  const ctaHref = single ? productUrl(items[0].product) : `${base}/jewellery`;
  const ctaLabel = single ? 'Complete your order' : 'Back to your favourites';
  const itemsTotal = items.reduce((s, it) => s + it.quantity * it.price, 0);

  const rows = items.map((it) => `
    <tr>
      <td width="76" style="padding:12px 0;border-top:1px solid #f0ebe2;vertical-align:middle;">
        <a href="${esc(productUrl(it.product))}"><img src="${esc(imageUrl(it.product?.image, base))}" width="64" height="64" alt="${esc(it.product?.name || '')}" style="display:block;border-radius:10px;border:1px solid #ebe5da;object-fit:cover;" /></a>
      </td>
      <td style="padding:12px 0 12px 12px;border-top:1px solid #f0ebe2;vertical-align:middle;font-size:15px;color:#111110;">
        <a href="${esc(productUrl(it.product))}" style="color:#111110;text-decoration:none;font-weight:bold;">${esc(it.product?.name || 'Jewellery piece')}</a><br/>
        <span style="font-size:12px;color:#7a756b;">Qty ${it.quantity}</span>
      </td>
      <td align="right" style="padding:12px 0;border-top:1px solid #f0ebe2;vertical-align:middle;font-size:15px;font-weight:bold;color:#111110;white-space:nowrap;">${inr(it.quantity * it.price)}</td>
    </tr>`).join('');

  const html = `
<div style="background:#FFF8EE;padding:28px 12px;font-family:${FONT};">
  <table cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #ebe5da;border-collapse:separate;overflow:hidden;">
    <tr><td align="center" style="background:#1f2024;padding:20px;">
      <img src="${esc(base)}/logo_white.png" height="28" alt="ZUNUZ" style="display:block;border:0;" />
    </td></tr>
    <tr><td style="padding:30px 28px 6px 28px;text-align:center;">
      <h1 style="margin:0 0 10px 0;font-size:23px;line-height:1.3;color:#111110;">Still thinking it over, ${esc(firstName)}? ✨</h1>
      <p style="margin:0 auto;max-width:420px;font-size:15px;line-height:1.6;color:#5f5b53;">
        Your checkout didn't go through, so we saved your picks for you. They're still here whenever you're ready — popular pieces do sell out, though.
      </p>
    </td></tr>
    <tr><td style="padding:18px 28px 4px 28px;">
      <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">${rows}
        <tr><td colspan="2" style="padding:12px 0 0 0;border-top:1px solid #ebe5da;font-size:14px;color:#7a756b;">Items total</td>
            <td align="right" style="padding:12px 0 0 0;border-top:1px solid #ebe5da;font-size:16px;font-weight:bold;color:#111110;">${inr(itemsTotal)}</td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:24px 28px 30px 28px;">
      <a href="${esc(ctaHref)}" style="display:inline-block;background:#111110;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.05em;text-transform:uppercase;padding:14px 28px;border-radius:10px;">${esc(ctaLabel)}</a>
      <p style="margin:16px 0 0 0;font-size:13px;color:#7a756b;">Had trouble paying? Just reply${supportEmail ? ` or write to <a href="mailto:${esc(supportEmail)}" style="color:#FF3D8B;">${esc(supportEmail)}</a>` : ''} — we're happy to help.</p>
    </td></tr>
  </table>
  <p style="max-width:580px;margin:14px auto 0 auto;font-size:12px;line-height:1.6;color:#8a847a;text-align:center;">You're receiving this because you started a checkout on ZUNUZ. We only send this reminder once.</p>
</div>`;

  const text = [
    `Still thinking it over, ${firstName}?`,
    '',
    "Your checkout didn't go through, so we saved your picks for you:",
    ...items.map((it) => `• ${it.product?.name || 'Jewellery piece'} (qty ${it.quantity}) — ${inr(it.quantity * it.price)} — ${productUrl(it.product)}`),
    '',
    `Items total: ${inr(itemsTotal)}`,
    `${ctaLabel}: ${ctaHref}`,
    '',
    `Had trouble paying? Reply to this email${supportEmail ? ` or write to ${supportEmail}` : ''}.`,
  ].join('\n');

  return { subject: 'You left something sparkly behind ✨', html, text };
}

module.exports = { checkoutReminderEmail };
