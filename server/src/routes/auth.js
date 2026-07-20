const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const RESEND_COOLDOWN_MS = 30 * 1000; // matches the frontend's 30s resend timer
const MAX_VERIFY_ATTEMPTS = 5;

// Defense-in-depth against a single IP hammering these endpoints, on top of
// the per-phone resend cooldown and per-OTP attempt cap enforced below.
const sendOtpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const verifyOtpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const googleLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await prisma.customer.create({
      data: { name: name?.trim() || null, email, passwordHash, phone: phone?.trim() || null },
    });

    const token = jwt.sign({ id: customer.id, email: customer.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
      isNewUser: true,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const customer = await prisma.customer.findUnique({ where: { email } });
    // Same generic error whether the account doesn't exist, has no password (Google-only), or the password is wrong.
    if (!customer || !customer.passwordHash) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: customer.id, email: customer.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/google
router.post('/google', googleLimiter, async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Google credential is required' });

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const { sub: googleId, email, name } = ticket.getPayload();

    let customer = await prisma.customer.findUnique({ where: { googleId } });
    let isNewUser = false;

    // Link to an existing email-based account rather than creating a duplicate customer.
    if (!customer && email) {
      const byEmail = await prisma.customer.findUnique({ where: { email } });
      if (byEmail) customer = await prisma.customer.update({ where: { id: byEmail.id }, data: { googleId } });
    }

    if (!customer) {
      isNewUser = true;
      customer = await prisma.customer.create({ data: { googleId, email: email || null, name: name || null } });
    }

    const token = jwt.sign({ id: customer.id, email: customer.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
      isNewUser,
    });
  } catch (e) {
    console.error(e);
    res.status(401).json({ error: 'Google sign-in failed' });
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', sendOtpLimiter, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });

  const clean = phone.replace(/\D/g, '').slice(-10);
  if (clean.length !== 10) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });

  try {
    const recent = await prisma.otpRequest.findFirst({ where: { phone: clean }, orderBy: { createdAt: 'desc' } });
    if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - recent.createdAt.getTime())) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSec}s before requesting another OTP.` });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    await prisma.otpRequest.deleteMany({ where: { phone: clean } });
    await prisma.otpRequest.create({ data: { phone: clean, otp, expiresAt } });

    const existing = await prisma.customer.findUnique({ where: { phone: clean } });

    // TODO: replace console.log with real SMS (Twilio / Fast2SMS / MSG91)
    console.log(`[OTP] +91 ${clean} → ${otp}`);

    const response = { message: 'OTP sent', isNewUser: !existing };
    if (process.env.NODE_ENV !== 'production') response.devOtp = otp;
    res.json(response);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', verifyOtpLimiter, async (req, res) => {
  const { phone, otp, name } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' });

  const clean = phone.replace(/\D/g, '').slice(-10);

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
        data: { phone: clean, name: name?.trim() || null },
      });
    }

    const token = jwt.sign({ id: customer.id, phone: customer.phone }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
      isNewUser,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
