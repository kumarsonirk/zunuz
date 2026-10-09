const router = require('express').Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/customerAuth');
const { verifyCustomerToken } = auth;
const { sendNewsletterWelcome } = require('../lib/mail/newsletter');
const { CLIENT_URL } = require('../lib/email');

const prisma = require('../lib/prisma');

// Newsletter (home page "Be first in line for the good stuff.").
//   POST /subscribe   { email, source? }  — join (or re-join) the list
//   POST /unsubscribe { token } or ?token= — one-click unsubscribe (the
//        storefront /unsubscribe page, or a mail app's List-Unsubscribe-Post)
//   GET  /unsubscribe?token= — mail apps / old links: send to that page
//   POST /resubscribe { token } — "changed my mind" on the unsubscribe page
//   GET  /status (signed in) — { subscribed } so the home page can hide the
//        sign-up box for customers already on the list
// Joining always answers the same way (200, same message) whether the email
// is new, already on the list or unsubscribed — nobody can use this to check
// who's subscribed. An address that unsubscribed is NOT re-added from this
// public form (anyone could type it in): only its own unsubscribe link's
// "Resubscribe" can bring it back. The welcome email goes to new subscribers
// only, at most WELCOME_DAILY_CAP a day (so the form can't be used to spam).

const subscribeLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many sign-ups from here — please try again later.' } });
const tokenLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests — please try again later.' } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SOURCES = ['home', 'footer', 'checkout', 'account'];
const newToken = () => crypto.randomBytes(24).toString('hex');
const tokenOf = (req) => {
  const t = req.body?.token ?? req.query?.token;
  return typeof t === 'string' && /^[a-f0-9]{48}$/.test(t) ? t : null;
};
// a***@gmail.com — enough for "is this me?" without revealing the address.
const maskEmail = (e) => { const [u, d] = String(e).split('@'); return `${u.slice(0, 1)}${'*'.repeat(Math.max(1, Math.min(u.length - 1, 6)))}@${d}`; };

async function customerIdFor(req, email) {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) {
    try { const me = await verifyCustomerToken(h.slice(7)); if (me?.id) return me.id; } catch { /* anonymous */ }
  }
  const c = await prisma.customer.findUnique({ where: { email }, select: { id: true } }).catch(() => null);
  return c?.id || null;
}

async function welcome(sub) {
  const sentToday = await prisma.emailLog.count({ where: { type: 'NEWSLETTER_WELCOME', createdAt: { gte: new Date(Date.now() - 864e5) } } }).catch(() => 0);
  if (sentToday >= WELCOME_DAILY_CAP) { console.warn('Newsletter welcome email skipped: daily cap reached'); return; }
  sendNewsletterWelcome(sub)
    .then(() => prisma.newsletterSubscriber.update({ where: { id: sub.id }, data: { welcomeSentAt: new Date() } }))
    .catch((e) => console.error('Newsletter welcome email failed:', e));
}

const OK = { ok: true, message: "You're on the list." };
const WELCOME_DAILY_CAP = 300;

router.post('/subscribe', subscribeLimiter, async (req, res) => {
  const raw = req.body?.email;
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  const source = SOURCES.includes(req.body?.source) ? req.body.source : 'home';
  try {
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing) return res.json(OK); // already on the list, or opted out — leave it as it is
    const customerId = await customerIdFor(req, email);
    let sub;
    try {
      sub = await prisma.newsletterSubscriber.create({ data: { email, source, customerId, unsubToken: newToken() } });
    } catch (e) {
      if (e.code === 'P2002') return res.json(OK); // joined twice at the same moment
      throw e;
    }
    welcome(sub).catch((e) => console.error('Newsletter welcome email failed:', e));
    res.json(OK);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "We couldn't add you right now — please try again." });
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const me = await prisma.customer.findUnique({ where: { id: req.customer.id }, select: { email: true } });
    const or = [{ customerId: req.customer.id }];
    if (me?.email) or.push({ email: me.email.toLowerCase() });
    const sub = await prisma.newsletterSubscriber.findFirst({ where: { status: 'SUBSCRIBED', OR: or }, select: { id: true } });
    res.set('Cache-Control', 'no-store');
    res.json({ subscribed: !!sub });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/unsubscribe', (req, res) => {
  const token = tokenOf(req);
  res.redirect(302, `${CLIENT_URL}/unsubscribe${token ? `?token=${token}` : ''}`);
});

router.post('/unsubscribe', tokenLimiter, async (req, res) => {
  const token = tokenOf(req);
  if (!token) return res.status(400).json({ error: 'This unsubscribe link is not valid.' });
  try {
    const sub = await prisma.newsletterSubscriber.findUnique({ where: { unsubToken: token } });
    if (!sub) return res.status(404).json({ error: 'This unsubscribe link is not valid.' });
    if (sub.status !== 'UNSUBSCRIBED') {
      await prisma.newsletterSubscriber.update({ where: { id: sub.id }, data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() } });
    }
    res.json({ ok: true, email: maskEmail(sub.email) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
});

router.post('/resubscribe', tokenLimiter, async (req, res) => {
  const token = tokenOf(req);
  if (!token) return res.status(400).json({ error: 'This link is not valid.' });
  try {
    const sub = await prisma.newsletterSubscriber.findUnique({ where: { unsubToken: token } });
    if (!sub) return res.status(404).json({ error: 'This link is not valid.' });
    if (sub.status !== 'SUBSCRIBED') {
      await prisma.newsletterSubscriber.update({ where: { id: sub.id }, data: { status: 'SUBSCRIBED', unsubscribedAt: null } });
    }
    res.json({ ok: true, email: maskEmail(sub.email) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
});

module.exports = router;
