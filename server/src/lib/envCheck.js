// Start-up settings check. Some missing settings don't crash anything but
// quietly break the store in production — emails (incl. password-reset
// links) only written to the logs, email links pointing at localhost, paid
// orders never confirmed when the shopper closes the tab, login tokens signed
// with a guessable secret. On the live server (NODE_ENV=production) the API
// refuses to start until they're set; in development it only warns.

const REQUIRED = [
  ['DATABASE_URL', 'database connection'],
  ['JWT_SECRET', 'customer login tokens'],
  ['JWT_ADMIN_SECRET', 'admin login tokens'],
  ['CLIENT_URL', 'storefront address (CORS + links in emails)'],
  ['RAZORPAY_KEY_ID', 'Razorpay'],
  ['RAZORPAY_KEY_SECRET', 'Razorpay payment signatures'],
  ['RAZORPAY_WEBHOOK_SECRET', 'Razorpay webhook (confirms payments when the shopper closes the tab, refund updates)'],
  ['RESEND_API_KEY', 'sending emails (otherwise they — and reset links — only go to the logs)'],
];

function checkEnv() {
  const prod = process.env.NODE_ENV === 'production';
  const problems = [];
  for (const [key, why] of REQUIRED) {
    if (!String(process.env[key] || '').trim()) problems.push(`${key} is not set (${why})`);
  }
  const a = process.env.JWT_SECRET || '';
  const b = process.env.JWT_ADMIN_SECRET || '';
  if (a && b && a === b) problems.push('JWT_SECRET and JWT_ADMIN_SECRET must be different');
  if (prod && /localhost|127\.0\.0\.1/.test(process.env.CLIENT_URL || '')) problems.push('CLIENT_URL points at localhost');
  if (prod && process.env.EXPOSE_DEV_SECRETS) problems.push('EXPOSE_DEV_SECRETS must not be set on the live server');

  const weak = [];
  for (const key of ['JWT_SECRET', 'JWT_ADMIN_SECRET']) {
    const v = process.env[key] || '';
    if (v && v.length < 32) weak.push(`${key} is short (${v.length} characters) — use 32+ random characters`);
  }

  if (problems.length && prod) {
    console.error(`\nRefusing to start — fix these settings on the server:\n  - ${problems.join('\n  - ')}\n`);
    process.exit(1);
  }
  for (const p of [...problems, ...weak]) console.warn(`[settings] ${p}`);
}

module.exports = { checkEnv };
