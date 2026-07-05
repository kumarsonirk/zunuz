const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min

// Defense-in-depth against a single IP hammering this endpoint, on top of
// the per-account lockout enforced below.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const waitMin = Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 60000);
      return res.status(429).json({ error: `Too many failed attempts. Try again in ${waitMin} minute(s).` });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      const failedAttempts = admin.failedAttempts + 1;
      const lockedUntil = failedAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;
      await prisma.admin.update({
        where: { id: admin.id },
        data: { failedAttempts: lockedUntil ? 0 : failedAttempts, lockedUntil }
      });
      if (lockedUntil) return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (admin.failedAttempts > 0 || admin.lockedUntil) {
      await prisma.admin.update({ where: { id: admin.id }, data: { failedAttempts: 0, lockedUntil: null } });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, process.env.JWT_ADMIN_SECRET, { expiresIn: '7d' });
    res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
