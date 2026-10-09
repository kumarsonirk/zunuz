const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const adminAuth = require('../../middleware/adminAuth');
const { getAdminAccess, invalidateAdminAccess, logActivity, PERMISSIONS } = require('../../lib/adminPermissions');
const settings = require('../../lib/settings');

const prisma = require('../../lib/prisma');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min

// Defense-in-depth against a single IP hammering this endpoint, on top of
// the per-account lockout enforced below.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

// GET /api/admin/auth/question — public for the login screen. Never returns the answer.
router.get('/question', loginLimiter, (req, res) => {
  const current = settings.get();
  res.json({
    question: current.adminSecurityQuestion || 'What is your store security code?',
    enabled: !!current.adminSecurityAnswerHash, // false → the login page skips the question
  });
});

router.post('/login', loginLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const answer = typeof req.body?.answer === 'string'
    ? req.body.answer.trim()
    : typeof req.body?.securityAnswer === 'string'
      ? req.body.securityAnswer.trim()
      : '';
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const questionOn = !!settings.get().adminSecurityAnswerHash;
  if (questionOn && !answer) {
    return res.status(400).json({ error: 'Please answer the security question' });
  }

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
      logActivity({ admin, action: 'LOGIN_FAILED', section: 'auth', summary: lockedUntil ? 'Failed sign-in — account locked for 15 minutes' : 'Failed sign-in (wrong password)', ip: req.ip });
      if (lockedUntil) return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (questionOn && !(await settings.checkSecurityAnswer(answer))) {
      const failedAttempts = admin.failedAttempts + 1;
      const lockedUntil = failedAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;
      await prisma.admin.update({
        where: { id: admin.id },
        data: { failedAttempts: lockedUntil ? 0 : failedAttempts, lockedUntil }
      });
      logActivity({ admin, action: 'LOGIN_FAILED', section: 'auth', summary: lockedUntil ? 'Failed sign-in — account locked for 15 minutes' : 'Failed sign-in (wrong security answer)', ip: req.ip });
      if (lockedUntil) return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });
      return res.status(401).json({ error: 'Invalid security answer' });
    }

    // "Deactivated" only after the right password, so the message can't be
    // used to find out which admin emails exist.
    if (!admin.isActive) return res.status(403).json({ error: 'This admin account has been deactivated.' });

    await prisma.admin.update({ where: { id: admin.id }, data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } });
    invalidateAdminAccess(admin.id);
    const access = await getAdminAccess(admin.id);
    logActivity({ admin, action: 'LOGIN', section: 'auth', summary: 'Signed in', ip: req.ip });

    const token = jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, process.env.JWT_ADMIN_SECRET, { expiresIn: '12h' }); // short-lived: the token lives in localStorage
    res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email, role: access.role, permissions: access.permissions } });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/auth/me — change your own name and/or password (current password required for a new one).
router.put('/me', adminAuth, async (req, res) => {
  const { name, currentPassword, newPassword } = req.body || {};
  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.adminAccess.id } });
    const data = {};
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ error: 'Name is required.' });
      data.name = String(name).trim().slice(0, 120);
    }
    if (newPassword) {
      if (String(newPassword).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
      if (!currentPassword || !(await bcrypt.compare(String(currentPassword), admin.passwordHash))) return res.status(400).json({ error: 'Current password is incorrect.' });
      data.passwordHash = await bcrypt.hash(String(newPassword), 10);
    }
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Nothing to update.' });
    await prisma.admin.update({ where: { id: admin.id }, data });
    invalidateAdminAccess(admin.id);
    logActivity({ admin: { ...admin, name: data.name || admin.name }, action: 'UPDATE', section: 'auth', summary: [data.name && data.name !== admin.name ? 'Changed own name' : null, data.passwordHash ? 'Changed own password' : null].filter(Boolean).join(' & ') || 'Updated own account', ip: req.ip });
    const access = await getAdminAccess(admin.id);
    res.json({ id: access.id, name: access.name, email: access.email, role: access.role, permissions: access.permissions });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/admin/auth/me — who's signed in + what they may do (sidebar, guards).
router.get('/me', adminAuth, (req, res) => {
  const a = req.adminAccess;
  res.json({ id: a.id, name: a.name, email: a.email, role: a.role, permissions: a.permissions, allPermissions: PERMISSIONS });
});

module.exports = router;
