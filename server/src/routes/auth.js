const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const { PrismaClient } = require('@prisma/client');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../lib/email');

const prisma = new PrismaClient();
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

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await prisma.customer.create({
      data: { name: name?.trim() || null, email, passwordHash, phone: phone?.trim() || null },
    });

    // Send Welcome Email asynchronously
    sendWelcomeEmail(customer.email, customer.name).catch(err => console.error('Error sending welcome email:', err));

    const token = jwt.sign({ id: customer.id, email: customer.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
      isNewUser: true,
    });
  } catch (e) {
    if (e.code === 'P2002' && e.meta?.target?.includes('phone')) {
      return res.status(409).json({ error: 'Phone number is already associated with another account' });
    }
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

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

  try {
    const customer = await prisma.customer.findUnique({ where: { email } });
    
    // Mitigate email enumeration: return success even if email is not found
    if (!customer) {
      return res.json({ message: 'If this email is associated with an account, a reset link has been sent.' });
    }

    const token = jwt.sign({ id: customer.id, action: 'reset-password' }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    // Send email using our email service
    await sendPasswordResetEmail(customer.email, customer.name, resetLink);

    const response = { message: 'If this email is associated with an account, a reset link has been sent.' };
    if (process.env.NODE_ENV !== 'production') {
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
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.action !== 'reset-password') {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const customer = await prisma.customer.findUnique({ where: { id: payload.id } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null
      }
    });

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Token invalid or expired. Please request a new link.' });
  }
});

module.exports = router;
