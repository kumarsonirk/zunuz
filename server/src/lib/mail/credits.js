// "₹X ZUNUZ Credits added" email — referral reward, friend's welcome bonus.
const { sendMailHelper, CLIENT_URL } = require('../email');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function creditEmailHtml({ name, amount, headline, body, expiryDays }) {
  return `
  <div style="background-color: #131417; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto 24px auto; border-collapse: collapse;">
      <tr><td align="center"><img src="${CLIENT_URL}/logo_white.png" height="30" style="display: block; border: 0;" alt="ZUNUZ" /></td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #FFF8EE; border-radius: 16px; overflow: hidden; border-collapse: collapse;">
      <tr><td style="height: 6px; background-color: #F6C915;"></td></tr>
      <tr>
        <td style="padding: 36px 32px 32px 32px; text-align: left;">
          <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; color: #FF3D8B;">ZUNUZ Credits</p>
          <h1 style="font-family: 'Grift', 'Space Grotesk', sans-serif; font-size: 28px; font-weight: bold; color: #111110; margin: 0 0 14px 0;">${esc(headline)}</h1>
          <p style="font-size: 15px; color: #3f3f46; line-height: 1.6; margin: 0 0 14px 0;">Hi ${esc(name || 'there')}, ${esc(body)}</p>
          <p style="font-size: 36px; font-weight: bold; color: #111110; margin: 6px 0 18px 0;">₹${Number(amount).toLocaleString('en-IN')}</p>
          <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 0 8px 0;">
            <tr><td style="background-color: #111110; border-radius: 999px;">
              <a href="${CLIENT_URL}/jewellery" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; letter-spacing: 0.03em;">Shop &amp; use my credits</a>
            </td></tr>
          </table>
          <p style="font-size: 12px; color: #71717a; line-height: 1.6; margin: 18px 0 0 0;">Credits are applied at checkout and expire ${Number(expiryDays) || 180} days after they're added. They can't be withdrawn or transferred. See your balance any time in <a href="${CLIENT_URL}/account/refer" style="color: #FF3D8B;">My account → Refer &amp; Earn</a>.</p>
        </td>
      </tr>
    </table>
  </div>`;
}

// customer: { email, name }
async function sendCreditEmail(customer, { amount, headline, body, expiryDays, type }) {
  if (!customer?.email) return null;
  const html = creditEmailHtml({ name: customer.name, amount, headline, body, expiryDays });
  const text = `${headline}\n\nHi ${customer.name || 'there'}, ${body}\n\n₹${amount} ZUNUZ Credits — use them at checkout: ${CLIENT_URL}/jewellery\nCredits expire ${expiryDays} days after they're added and can't be withdrawn or transferred.`;
  return sendMailHelper({ to: customer.email, subject: `${headline} — ZUNUZ`, html, text }, { type });
}

module.exports = { sendCreditEmail };
