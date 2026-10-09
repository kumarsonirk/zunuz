// Email-verification link: signed with its own secret (derived from
// JWT_SECRET) so it can never be replayed as a login or reset token, and
// carries the address it was sent to — changing the email kills old links.
// Sent on email/password signup, on email change, and on "Resend email".
const jwt = require('jsonwebtoken');
const { sendMailHelper, CLIENT_URL } = require('../email');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const VERIFY_ACTION = 'verify-email';
const verifySecret = () => `${process.env.JWT_SECRET}:verify-email`;

function signVerifyToken(customer) {
  return jwt.sign({ id: customer.id, action: VERIFY_ACTION, email: customer.email }, verifySecret(), { expiresIn: '48h' });
}

// Throws if the token is invalid / expired / not a verify-email token.
function readVerifyToken(token) {
  const payload = jwt.verify(token, verifySecret());
  if (!payload || payload.action !== VERIFY_ACTION || !payload.id || !payload.email) throw new Error('Wrong token type');
  return payload;
}

function getVerifyEmailHtml(name, link) {
  return `
  <div style="background-color: #131417; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto 24px auto; border-collapse: collapse;">
      <tr><td align="center"><img src="${CLIENT_URL}/logo_white.png" height="30" style="display: block; border: 0;" alt="ZUNUZ" /></td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #FFF8EE; border-radius: 16px; overflow: hidden; border-collapse: collapse;">
      <tr><td style="height: 6px; background-color: #FF3D8B;"></td></tr>
      <tr>
        <td style="padding: 36px 32px 32px 32px; text-align: left;">
          <h1 style="font-family: 'Grift', 'Space Grotesk', sans-serif; font-size: 26px; font-weight: bold; color: #111110; margin: 0 0 14px 0;">Confirm your email ✉️</h1>
          <p style="font-size: 15px; color: #3f3f46; line-height: 1.6; margin: 0 0 22px 0;">Hi ${esc(name || 'there')}, tap the button below to confirm this is your email address. Once it's verified you can use coupon codes at checkout.</p>
          <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 0 8px 0;">
            <tr><td style="background-color: #111110; border-radius: 999px;">
              <a href="${esc(link)}" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; letter-spacing: 0.03em;">Verify my email</a>
            </td></tr>
          </table>
          <p style="font-size: 13px; color: #71717a; line-height: 1.6; margin: 20px 0 0 0;">This link works for 48 hours. If you didn't create a ZUNUZ account, you can ignore this email.</p>
          <p style="font-size: 12px; color: #a1a1aa; line-height: 1.6; margin: 14px 0 0 0; word-break: break-all;">Button not working? Paste this into your browser:<br/><a href="${esc(link)}" style="color: #FF3D8B;">${esc(link)}</a></p>
        </td>
      </tr>
    </table>
    <p style="max-width: 580px; margin: 20px auto 0 auto; text-align: center; font-size: 12px; color: #71717a; line-height: 1.6;">
      Need help? Visit <a href="${CLIENT_URL}/account/help-center" style="color: #FF3D8B; text-decoration: none;">our help centre</a>.<br/>This is an automated message — please don't reply directly.
    </p>
  </div>`;
}

// customer: { id, name, email }. No-op for accounts without an email.
async function sendVerificationEmail(customer) {
  if (!customer?.email) return null;
  const link = `${CLIENT_URL}/verify-email?token=${encodeURIComponent(signVerifyToken(customer))}`;
  const html = getVerifyEmailHtml(customer.name, link);
  const text = `Hi ${customer.name || 'there'},\n\nConfirm your ZUNUZ email address by opening this link (valid 48 hours):\n\n${link}\n\nOnce verified you can use coupon codes at checkout. If you didn't create a ZUNUZ account, ignore this email.`;
  return sendMailHelper({ to: customer.email, subject: 'Verify your email - ZUNUZ', html, text }, { type: 'EMAIL_VERIFY' });
}

module.exports = { sendVerificationEmail, signVerifyToken, readVerifyToken, getVerifyEmailHtml };
