// Newsletter welcome email ("You're on the list"), sent once when someone
// joins from the home page. Every newsletter email carries the subscriber's
// one-click unsubscribe link (storefront /unsubscribe page), plus the
// List-Unsubscribe headers mail apps use for their own "Unsubscribe" button
// (only when API_PUBLIC_URL is set, since that header needs the API address).
const { sendMailHelper, CLIENT_URL } = require('../email');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const unsubscribeLink = (token) => `${CLIENT_URL}/unsubscribe?token=${encodeURIComponent(token)}`;

function unsubscribeHeaders(token) {
  const api = String(process.env.API_PUBLIC_URL || '').replace(/\/+$/, '');
  if (!api) return undefined;
  return {
    'List-Unsubscribe': `<${api}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

function getNewsletterWelcomeHtml(link) {
  return `
  <div style="background-color: #131417; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto 24px auto; border-collapse: collapse;">
      <tr><td align="center"><img src="${CLIENT_URL}/logo_white.png" height="30" style="display: block; border: 0;" alt="ZUNUZ" /></td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #FFF8EE; border-radius: 16px; overflow: hidden; border-collapse: collapse;">
      <tr><td style="height: 6px; background-color: #4FC4CF;"></td></tr>
      <tr>
        <td style="padding: 36px 32px 32px 32px; text-align: left;">
          <h1 style="font-family: 'Grift', 'Space Grotesk', sans-serif; font-size: 26px; font-weight: bold; color: #111110; margin: 0 0 14px 0;">You're on the list 💌</h1>
          <p style="font-size: 15px; color: #3f3f46; line-height: 1.6; margin: 0 0 14px 0;">Thanks for joining! You'll be first to hear about new drops, early access and members-only offers — two emails a month, max.</p>
          <p style="font-size: 15px; color: #3f3f46; line-height: 1.6; margin: 0 0 22px 0;">While you wait, our jewellery starts at just ₹199.</p>
          <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 0 8px 0;">
            <tr><td style="background-color: #111110; border-radius: 999px;">
              <a href="${CLIENT_URL}/jewellery" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; letter-spacing: 0.03em;">Shop jewellery</a>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="max-width: 580px; margin: 20px auto 0 auto; text-align: center; font-size: 12px; color: #71717a; line-height: 1.6;">
      You're getting this because this address joined the ZUNUZ list.<br/>
      Changed your mind? <a href="${esc(link)}" style="color: #FF3D8B; text-decoration: underline;">Unsubscribe in one click</a>.
    </p>
  </div>`;
}

// subscriber: { email, unsubToken }
async function sendNewsletterWelcome(subscriber) {
  const link = unsubscribeLink(subscriber.unsubToken);
  const text = `You're on the ZUNUZ list!\n\nYou'll be first to hear about new drops, early access and members-only offers — two emails a month, max.\n\nShop jewellery: ${CLIENT_URL}/jewellery\n\nUnsubscribe in one click: ${link}`;
  return sendMailHelper(
    { to: subscriber.email, subject: "You're on the list — ZUNUZ", html: getNewsletterWelcomeHtml(link), text, headers: unsubscribeHeaders(subscriber.unsubToken) },
    { type: 'NEWSLETTER_WELCOME' },
  );
}

module.exports = { sendNewsletterWelcome, unsubscribeLink, getNewsletterWelcomeHtml };
