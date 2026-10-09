// Fulfilment emails: shipped (with tracking), delivered (ask for a review),
// refund processed / initiated, and return-request status updates.
// All go through sendMailHelper so they land in EmailLog.
const { sendMailHelper, CLIENT_URL } = require('../email');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => new Date(d || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const nameOf = (order) => order?.address?.name || order?.customer?.name || 'there';
const emailOf = (order) => order?.customer?.email || order?.address?.email || null;
const ordersLink = (id) => `${CLIENT_URL}/account/orders${id ? `?open=${id}` : ''}`;

// Shared shell: logo on dark, white card, optional button + detail rows.
function layout({ heading, accent = '#111110', intro, rows = [], button, note }) {
  const rowsHtml = rows.filter(Boolean).map(([k, v]) => `
    <tr>
      <td style="padding: 8px 0; font-size: 13px; color: #71717a; width: 42%; vertical-align: top;">${esc(k)}</td>
      <td style="padding: 8px 0; font-size: 14px; color: #111110; font-weight: 600; text-align: right; word-break: break-all;">${esc(v)}</td>
    </tr>`).join('');
  return `
  <div style="background-color: #131417; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto 24px auto; border-collapse: collapse;">
      <tr><td align="center"><img src="${CLIENT_URL}/logo_white.png" height="30" style="display: block; border: 0;" alt="ZUNUZ" /></td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #FFF8EE; border-radius: 16px; overflow: hidden; border-collapse: collapse;">
      <tr><td style="height: 6px; background-color: ${accent};"></td></tr>
      <tr>
        <td style="padding: 36px 32px 32px 32px; text-align: left;">
          <h1 style="font-family: 'Grift', 'Space Grotesk', sans-serif; font-size: 26px; font-weight: bold; color: #111110; margin: 0 0 14px 0;">${heading}</h1>
          <p style="font-size: 15px; color: #3f3f46; line-height: 1.6; margin: 0 0 22px 0;">${intro}</p>
          ${rowsHtml ? `<table cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 12px; border-collapse: separate; padding: 8px 18px; margin: 0 0 24px 0;">${rowsHtml}</table>` : ''}
          ${button ? `
          <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 0 8px 0;">
            <tr><td style="background-color: #111110; border-radius: 999px;">
              <a href="${esc(button.href)}" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; letter-spacing: 0.03em;">${esc(button.label)}</a>
            </td></tr>
          </table>` : ''}
          ${note ? `<p style="font-size: 13px; color: #71717a; line-height: 1.6; margin: 20px 0 0 0;">${note}</p>` : ''}
        </td>
      </tr>
    </table>
    <p style="max-width: 580px; margin: 20px auto 0 auto; text-align: center; font-size: 12px; color: #71717a; line-height: 1.6;">
      Need help? Visit <a href="${CLIENT_URL}/account/help-center" style="color: #FF3D8B; text-decoration: none;">our help centre</a>.<br/>This is an automated message — please don't reply directly.
    </p>
  </div>`;
}

const textOf = (lines) => lines.filter(Boolean).join('\n');

async function sendShippedEmail(order) {
  const to = emailOf(order);
  if (!to) return null;
  const hasTracking = !!order.trackingNumber;
  const html = layout({
    heading: 'Your order is on its way 🚚',
    accent: '#1A6FE8',
    intro: `Hi ${esc(nameOf(order))}, good news — order #${order.id} has been packed and handed over to our courier partner.${hasTracking ? ' You can follow it with the details below.' : ' We\'ll share tracking details as soon as they\'re available.'}`,
    rows: [
      ['Order', `#${order.id}`],
      order.courier && ['Courier', order.courier],
      hasTracking && ['Tracking number', order.trackingNumber],
      ['Shipped on', fmtDate(order.shippedAt)],
    ],
    button: order.trackingUrl ? { label: 'Track your package', href: order.trackingUrl } : { label: 'View your order', href: ordersLink(order.id) },
    note: 'Tracking updates can take a few hours to appear on the courier\'s website after pickup. Please record an unboxing video when your parcel arrives — it helps us resolve any damage claims quickly.',
  });
  const text = textOf([
    `Your order #${order.id} is on its way!`, '',
    order.courier && `Courier: ${order.courier}`,
    hasTracking && `Tracking number: ${order.trackingNumber}`,
    order.trackingUrl && `Track: ${order.trackingUrl}`,
    `View order: ${ordersLink(order.id)}`,
  ]);
  return sendMailHelper({ to, subject: `Shipped: your ZUNUZ order #${order.id} is on its way`, html, text }, { type: 'ORDER_SHIPPED', orderId: order.id });
}

async function sendDeliveredEmail(order) {
  const to = emailOf(order);
  if (!to) return null;
  const link = ordersLink(order.id);
  const html = layout({
    heading: 'Delivered — tell us what you think 💖',
    accent: '#FF3D8B',
    intro: `Hi ${esc(nameOf(order))}, your order #${order.id} has been delivered. We hope you love your new pieces! It takes less than a minute to rate your order, and it really helps us.`,
    rows: [['Order', `#${order.id}`], ['Delivered on', fmtDate(order.deliveredAt)]],
    button: { label: 'Rate your order', href: link },
    note: 'Something not right? Damaged, defective, wrong or missing items must be reported within <b>24 hours of delivery</b> with photos or an unboxing video — open the order in My Orders and tap “Report a problem”.',
  });
  const text = textOf([`Your order #${order.id} has been delivered.`, `Rate your order: ${link}`, '', 'Damaged, defective, wrong or missing item? Report it within 24 hours of delivery from My Orders.']);
  return sendMailHelper({ to, subject: `Delivered: how was your ZUNUZ order #${order.id}?`, html, text }, { type: 'ORDER_DELIVERED', orderId: order.id });
}

// amount = this refund (₹); pending = Razorpay accepted but hasn't settled yet.
async function sendRefundEmail(order, { amount, pending = false, manual = false } = {}) {
  const to = emailOf(order);
  if (!to) return null;
  const heading = pending ? 'Your refund has been initiated' : 'Your refund has been processed';
  const timing = manual
    ? 'The amount has been refunded to you directly.'
    : pending
      ? 'Your bank is processing it — it usually reaches your original payment method within 5–7 business days.'
      : 'It has been sent to your original payment method and usually reflects within 5–7 business days, depending on your bank.';
  const html = layout({
    heading,
    accent: '#1E8A4C',
    intro: `Hi ${esc(nameOf(order))}, we've refunded <b>${inr(amount)}</b> for order #${order.id}. ${timing}`,
    rows: [
      ['Order', `#${order.id}`],
      ['Refund amount', inr(amount)],
      (order.refundAmount || 0) > amount && ['Total refunded so far', inr(order.refundAmount)],
      order.refundId && !manual && ['Refund reference', order.refundId],
      ['Date', fmtDate(order.refundedAt)],
    ],
    button: { label: 'View your order', href: ordersLink(order.id) },
  });
  const text = textOf([`${heading}.`, `Order #${order.id} — refund of ${inr(amount)}.`, timing, order.refundId && !manual ? `Reference: ${order.refundId}` : null, ordersLink(order.id)]);
  return sendMailHelper({ to, subject: `Refund ${pending ? 'initiated' : 'processed'} for ZUNUZ order #${order.id}`, html, text }, { type: 'REFUND', orderId: order.id });
}

const RETURN_COPY = {
  PENDING: { heading: 'We\'ve received your request', accent: '#F6C915', body: 'Our team will review your photos/video and get back to you within 1–2 business days.' },
  APPROVED: { heading: 'Your request has been approved', accent: '#1E8A4C', body: null },
  REJECTED: { heading: 'Update on your request', accent: '#E8304F', body: 'Unfortunately we couldn\'t approve this request.' },
  COMPLETED: { heading: 'Your request is complete', accent: '#1A6FE8', body: null },
};

async function sendReturnUpdateEmail(request, order) {
  const to = emailOf(order) || request.customer?.email;
  if (!to) return null;
  const c = RETURN_COPY[request.status] || RETURN_COPY.PENDING;
  const kind = request.type === 'REFUND' ? 'refund' : 'replacement';
  let body = c.body;
  if (request.status === 'APPROVED') body = request.type === 'REFUND' ? 'We\'ll process your refund to the original payment method shortly — you\'ll get another email once it\'s sent.' : 'We\'re preparing your replacement and will email tracking details once it ships.';
  if (request.status === 'COMPLETED') body = request.type === 'REFUND' ? 'Your refund has been completed.' : 'Your replacement has been sent out.';
  const html = layout({
    heading: c.heading,
    accent: c.accent,
    intro: `Hi ${esc(nameOf(order))}, this is about your ${kind} request #${request.id} for order #${order.id}. ${body}`,
    rows: [['Request', `#${request.id} · ${kind}`], ['Reason', request.reason], ['Status', request.status.charAt(0) + request.status.slice(1).toLowerCase()]],
    note: request.adminNote ? `<b>Note from our team:</b> ${esc(request.adminNote)}` : null,
    button: { label: 'View in My Orders', href: ordersLink(order.id) },
  });
  const text = textOf([`${c.heading}.`, `Request #${request.id} (${kind}) for order #${order.id}: ${request.status}.`, body, request.adminNote && `Note from our team: ${request.adminNote}`, ordersLink(order.id)]);
  return sendMailHelper({ to, subject: `${c.heading} — ZUNUZ order #${order.id}`, html, text }, { type: 'RETURN_UPDATE', orderId: order.id });
}

module.exports = { sendShippedEmail, sendDeliveredEmail, sendRefundEmail, sendReturnUpdateEmail };
