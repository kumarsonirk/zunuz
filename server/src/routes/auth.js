const router = require('express').Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const RESEND_COOLDOWN_MS = 30 * 1000; // matches the frontend's 30s resend timer
const MAX_VERIFY_ATTEMPTS = 5;

// Defense-in-depth against a single IP hammering these endpoints, on top of
// the per-phone resend cooldown and per-OTP attempt cap enforced below.
const sendOtpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const verifyOtpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

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

    const token = jwt.sign({ id: customer.id, phone: customer.phone }, process.env.JWT_SECRET, { expiresIn: '30d' });
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
