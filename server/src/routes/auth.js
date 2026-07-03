const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });

  const clean = phone.replace(/\D/g, '').slice(-10);
  if (clean.length !== 10) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  try {
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
router.post('/verify-otp', async (req, res) => {
  const { phone, otp, name } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' });

  const clean = phone.replace(/\D/g, '').slice(-10);

  try {
    const record = await prisma.otpRequest.findFirst({
      where: { phone: clean, otp },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });
    if (new Date() > record.expiresAt) {
      await prisma.otpRequest.delete({ where: { id: record.id } });
      return res.status(400).json({ error: 'OTP expired. Request a new one.' });
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
