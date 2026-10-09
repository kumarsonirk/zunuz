const router = require('express').Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const { sendWelcomeEmail, sendPasswordResetEmail, CLIENT_URL } = require('../lib/email');
const { sendVerificationEmail, readVerifyToken } = require('../lib/mail/verify');
const customerAuth = require('../middleware/customerAuth');

const referrals = require('../lib/referrals');
const prisma = require('../lib/prisma');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const RESEND_COOLDOWN_MS = 30 * 1000; // matches the frontend's 30s resend timer
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Defense-in-depth against a single IP hammering these endpoints, on top of
// the per-phone resend cooldown and per-OTP attempt cap enforced below.
const sendOtpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const verifyOtpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const googleLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const forgotPasswordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });
const resetPasswordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const verifyEmailLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
// Keyed per customer (runs after customerAuth) so one inbox can't be spammed.
const resendVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 3, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => `customer:${req.customer.id}`,
  message: { error: 'Too many verification emails. Please try again in a few minutes.' },
});

// Dev-only helpers (devOtp, devToken/devLink) are an explicit opt-in — a
// staging box that forgot NODE_ENV=production must not leak OTPs / reset links.
const exposeDevSecrets = () => process.env.EXPOSE_DEV_SECRETS === '1' && process.env.NODE_ENV !== 'production';

// Request bodies are untrusted JSON: accept strings (and numbers, for phones
// / OTPs typed as numbers), reject objects/arrays instead of crashing on them.
const asStr = (v) => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : null);
const isBlank = (v) => v === undefined || v === null || v === '';

// Login tokens carry the customer's tokenVersion (tv); bumping it in the DB
// signs out every older token (see middleware/customerAuth.js).
const signLoginToken = (customer, claims = {}) =>
  jwt.sign({ id: customer.id, ...claims, tv: customer.tokenVersion ?? 0 }, process.env.JWT_SECRET, { expiresIn: '7d' });

const publicCustomer = (c) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, emailVerified: !!c.emailVerified });

// Password-reset tokens use their own secret and pin a fingerprint of the
// current password hash, so a link stops working once it (or any other
// password change) has been used.
const resetSecret = () => `${process.env.JWT_SECRET}:reset-password`;
const passwordFingerprint = (hash) => crypto.createHash('sha256').update(hash || '').digest('hex').slice(0, 16);

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  const body = req.body || {};
  const email = asStr(body.email)?.trim();
  const password = asStr(body.password);
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (!emailRegex.test(email) || email.length > 191) return res.status(400).json({ error: 'Invalid email format' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (password.length > 200) return res.status(400).json({ error: 'Password is too long' });
  if (!isBlank(body.name) && asStr(body.name) === null) return res.status(400).json({ error: 'Name must be text' });
  if (!isBlank(body.phone) && asStr(body.phone) === null) return res.status(400).json({ error: 'Phone must be text' });
  const name = asStr(body.name)?.trim().slice(0, 100) || null;
  let phone = null;
  if (!isBlank(body.phone)) {
    phone = asStr(body.phone).replace(/\D/g, '').slice(-10);
    if (phone.length !== 10) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
  }

  try {
    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await prisma.customer.create({
      data: { name, email, passwordHash, phone, emailVerified: false },
    });

    // Referred by a friend? Link them (bonus credit after email verification).
    await referrals.attachReferral(customer, asStr(body.referralCode));

    // Welcome + verification emails go out asynchronously
    sendWelcomeEmail(customer.email, customer.name).catch(err => console.error('Error sending welcome email:', err));
    sendVerificationEmail(customer).catch(err => console.error('Error sending verification email:', err));

    const token = signLoginToken(customer, { email: customer.email });
    res.json({
      token,
      customer: publicCustomer(customer),
      isNewUser: true,
      verificationSent: true,
    });
  } catch (e) {
    if (e.code === 'P2002' && e.meta?.target?.includes('phone')) {
      return res.status(409).json({ error: 'Phone number is already associated with another account' });
    }
    if (e.code === 'P2002') return res.status(409).json({ error: 'An account with this email already exists' });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const email = asStr(req.body?.email)?.trim();
  const password = asStr(req.body?.password);
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const customer = await prisma.customer.findUnique({ where: { email } });
    // Same generic error whether the account doesn't exist, has no password (Google-only), or the password is wrong.
    if (!customer || !customer.passwordHash) return res.status(401).json({ error: 'Invalid email or password' });

    // Check customer account lockout
    if (customer.lockedUntil && customer.lockedUntil > new Date()) {
      const waitMin = Math.ceil((customer.lockedUntil.getTime() - Date.now()) / 60000);
      return res.status(429).json({ error: `Too many failed attempts. Account is locked. Try again in ${waitMin} minute(s).` });
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      const failedAttempts = customer.failedAttempts + 1;
      const lockedUntil = failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;

      await prisma.customer.update({
        where: { id: customer.id },
        data: { failedAttempts: lockedUntil ? 0 : failedAttempts, lockedUntil }
      });

      if (lockedUntil) {
        return res.status(429).json({ error: 'Too many failed login attempts. Your account is locked for 15 minutes.' });
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Reset failed attempts on successful login
    if (customer.failedAttempts > 0 || customer.lockedUntil) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { failedAttempts: 0, lockedUntil: null }
      });
    }

    const token = signLoginToken(customer, { email: customer.email });
    res.json({
      token,
      customer: publicCustomer(customer),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});


// Find / link / create the customer for a verified Google identity.
// Linking to an existing email account: if that account never proved it owns
// the email, it may have been pre-registered by someone else to hijack the
// victim's future Google login — so wipe its password and sign out its
// sessions before handing it to the Google user.
async function findOrCreateGoogleCustomer({ googleId, email, name }) {
  let customer = await prisma.customer.findUnique({ where: { googleId } });
  if (customer) {
    if (!customer.emailVerified && email && customer.email && customer.email.toLowerCase() === email.toLowerCase()) {
      customer = await prisma.customer.update({ where: { id: customer.id }, data: { emailVerified: true } });
    }
    return { customer, isNewUser: false };
  }

  if (email) {
    const byEmail = await prisma.customer.findUnique({ where: { email } });
    if (byEmail) {
      const data = byEmail.emailVerified
        ? { googleId, emailVerified: true }
        : { googleId, emailVerified: true, passwordHash: null, tokenVersion: { increment: 1 }, failedAttempts: 0, lockedUntil: null };
      customer = await prisma.customer.update({ where: { id: byEmail.id }, data });
      if (!byEmail.emailVerified) customerAuth.invalidate(byEmail.id);
      return { customer, isNewUser: false };
    }
  }

  customer = await prisma.customer.create({ data: { googleId, email: email || null, name: name || null, emailVerified: !!email } });
  return { customer, isNewUser: true };
}

// POST /api/auth/google
router.post('/google', googleLimiter, async (req, res) => {
  const credential = asStr(req.body?.credential);
  if (!credential) return res.status(400).json({ error: 'Google credential is required' });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch (e) {
    console.error(e);
    return res.status(401).json({ error: 'Google sign-in failed' });
  }
  // Only trust the email if Google says it's been verified.
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    return res.status(401).json({ error: 'Your Google account email is not verified. Please verify it with Google or sign up with email.' });
  }

  try {
    const { customer, isNewUser } = await findOrCreateGoogleCustomer({ googleId: payload.sub, email: payload.email, name: payload.name });
    if (isNewUser) {
      // New account through a friend's link: link it; Google emails are
      // verified, so the friend's bonus credit is added straight away.
      if (await referrals.attachReferral(customer, asStr(req.body?.referralCode))) await referrals.grantFriendBonus(customer.id);
    }
    const token = signLoginToken(customer, { email: customer.email });
    res.json({
      token,
      customer: publicCustomer(customer),
      isNewUser,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Google sign-in failed' });
  }
});

// POST /api/auth/send-otp
// Phone-OTP login isn't finished (no SMS provider yet — codes only reach the
// server log), so it's switched off on the live server unless
// ENABLE_PHONE_OTP=1 (set that once real SMS sending is wired up).
const otpEnabled = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_PHONE_OTP !== '1') {
    return res.status(404).json({ error: 'Phone login is not available — please sign in with email or Google.' });
  }
  next();
};

router.post('/send-otp', otpEnabled, sendOtpLimiter, async (req, res) => {
  const phone = asStr(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });

  const clean = phone.replace(/\D/g, '').slice(-10);
  if (clean.length !== 10) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });

  try {
    const recent = await prisma.otpRequest.findFirst({ where: { phone: clean }, orderBy: { createdAt: 'desc' } });
    if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - recent.createdAt.getTime())) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSec}s before requesting another OTP.` });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    await prisma.otpRequest.deleteMany({ where: { phone: clean } });
    await prisma.otpRequest.create({ data: { phone: clean, otp, expiresAt } });

    const existing = await prisma.customer.findUnique({ where: { phone: clean } });

    // TODO: replace console.log with real SMS (Twilio / Fast2SMS / MSG91)
    console.log(`[OTP] +91 ${clean} → ${otp}`);

    const response = { message: 'OTP sent', isNewUser: !existing };
    if (exposeDevSecrets()) response.devOtp = otp;
    res.json(response);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', otpEnabled, verifyOtpLimiter, async (req, res) => {
  const phone = asStr(req.body?.phone);
  const otp = asStr(req.body?.otp)?.trim();
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' });
  if (!isBlank(req.body.name) && asStr(req.body.name) === null) return res.status(400).json({ error: 'Name must be text' });
  const name = asStr(req.body.name)?.trim().slice(0, 100) || null;

  const clean = phone.replace(/\D/g, '').slice(-10);
  if (clean.length !== 10) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });

  try {
    // Look up the active OTP request for this phone regardless of the guessed value,
    // so wrong guesses count against its attempt cap instead of just returning "not found".
    const record = await prisma.otpRequest.findFirst({
      where: { phone: clean },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) return res.status(400).json({ error: 'OTP expired or not requested. Please request a new one.' });
    if (new Date() > record.expiresAt) {
      await prisma.otpRequest.delete({ where: { id: record.id } });
      return res.status(400).json({ error: 'OTP expired. Request a new one.' });
    }
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      await prisma.otpRequest.delete({ where: { id: record.id } });
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new OTP.' });
    }
    if (record.otp !== otp) {
      const updated = await prisma.otpRequest.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      const remaining = MAX_VERIFY_ATTEMPTS - updated.attempts;
      return res.status(400).json({
        error: remaining > 0 ? `Incorrect OTP. ${remaining} attempt(s) left.` : 'Too many incorrect attempts. Please request a new OTP.'
      });
    }

    await prisma.otpRequest.delete({ where: { id: record.id } });

    let customer = await prisma.customer.findUnique({ where: { phone: clean } });
    const isNewUser = !customer;

    if (!customer) {
      customer = await prisma.customer.create({
        data: { phone: clean, name },
      });
    }

    const token = signLoginToken(customer, { phone: customer.phone });
    res.json({
      token,
      customer: publicCustomer(customer),
      isNewUser,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const email = asStr(req.body?.email)?.trim();
  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

  try {
    const customer = await prisma.customer.findUnique({ where: { email } });

    // Mitigate email enumeration: return success even if email is not found
    if (!customer) {
      return res.json({ message: 'If this email is associated with an account, a reset link has been sent.' });
    }

    const token = jwt.sign(
      { id: customer.id, action: 'reset-password', ph: passwordFingerprint(customer.passwordHash) },
      resetSecret(),
      { expiresIn: '15m' }
    );
    const resetLink = `${CLIENT_URL}/reset-password?token=${token}`;

    // Send email using our email service
    await sendPasswordResetEmail(customer.email, customer.name, resetLink);

    const response = { message: 'If this email is associated with an account, a reset link has been sent.' };
    if (exposeDevSecrets()) {
      response.devToken = token;
      response.devLink = resetLink;
    }
    res.json(response);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  const token = asStr(req.body?.token);
  const password = asStr(req.body?.password);
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (password.length > 200) return res.status(400).json({ error: 'Password is too long' });

  const invalid = () => res.status(400).json({ error: 'Token invalid or expired. Please request a new link.' });

  let payload;
  try { payload = jwt.verify(token, resetSecret()); } catch { return invalid(); }
  if (payload?.action !== 'reset-password' || !Number.isInteger(payload.id) || typeof payload.ph !== 'string') return invalid();

  try {
    const customer = await prisma.customer.findUnique({ where: { id: payload.id } });
    // A changed hash means this link was already used (or the password changed since): dead.
    if (!customer || passwordFingerprint(customer.passwordHash) !== payload.ph) return invalid();

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
        // Signs out every existing session (including a possible attacker's).
        tokenVersion: { increment: 1 },
      }
    });
    customerAuth.invalidate(customer.id);

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/verify-email — from the emailed link. Idempotent.
router.post('/verify-email', verifyEmailLimiter, async (req, res) => {
  const token = asStr(req.body?.token);
  if (!token) return res.status(400).json({ error: 'Verification token is required' });

  let payload;
  try { payload = readVerifyToken(token); } catch {
    return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
  }

  try {
    const customer = await prisma.customer.findUnique({ where: { id: Number(payload.id) } });
    if (!customer) return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
    // The link is for the address it was sent to — if the account's email has
    // changed since, it proves nothing about the new one.
    if (!customer.email || customer.email.toLowerCase() !== String(payload.email).toLowerCase()) {
      return res.status(400).json({ error: 'This link is for an email address that is no longer on your account.' });
    }
    if (!customer.emailVerified) {
      await prisma.customer.update({ where: { id: customer.id }, data: { emailVerified: true } });
    }
    // Joined through a friend's link? Their welcome credit is unlocked now.
    await referrals.grantFriendBonus(customer.id);
    res.json({ ok: true, email: customer.email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/resend-verification — signed-in customer, unverified email.
router.post('/resend-verification', customerAuth, resendVerifyLimiter, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.customer.id }, select: { id: true, name: true, email: true, emailVerified: true } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (!customer.email) return res.status(400).json({ error: 'Add an email address to your profile first.' });
    if (customer.emailVerified) return res.json({ ok: true, alreadyVerified: true });
    await sendVerificationEmail(customer);
    res.json({ ok: true, email: customer.email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
// Exposed for tests / reuse.
module.exports.findOrCreateGoogleCustomer = findOrCreateGoogleCustomer;
