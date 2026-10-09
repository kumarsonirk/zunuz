const router = require('express').Router();
const rateLimit = require('express-rate-limit');

const prisma = require('../lib/prisma');

// Public form, so it's throttled per IP and every field is type/length
// checked (a bot can't fill the admin's Campaign list with junk).
const submitLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many submissions — please try again later.' } });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INSTA_RE = /^@?[A-Za-z0-9._]{1,30}$/;
const text = (v) => (typeof v === 'string' ? v : '');

// Submit campaign application ("Shine with Us")
router.post('/submit', submitLimiter, async (req, res) => {
  try {
    const name = text(req.body?.name);
    const dob = text(req.body?.dob);
    const email = text(req.body?.email);
    const phone = text(req.body?.phone);
    const insta_id = text(req.body?.insta_id);

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (name.trim().length > 80) {
      return res.status(400).json({ error: 'Name is too long' });
    }
    if (!dob || !dob.trim()) {
      return res.status(400).json({ error: 'Date of birth is required' });
    }
    const dobYear = parseInt(dob.trim().split('-')[0], 10);
    if (isNaN(dobYear) || dobYear < 1920 || dobYear > new Date().getFullYear()) {
      return res.status(400).json({ error: 'Please select a valid birth year' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (email.trim().length > 120 || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cleanPhone = phone.trim().replace(/[\s\-\+\(\)]/g, '').replace(/^91/, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
    }

    if (!insta_id || !insta_id.trim()) {
      return res.status(400).json({ error: 'Instagram ID is required' });
    }
    if (!INSTA_RE.test(insta_id.trim())) {
      return res.status(400).json({ error: 'Please enter a valid Instagram ID' });
    }

    const cleanInsta = insta_id.trim().startsWith('@') ? insta_id.trim() : `@${insta_id.trim()}`;

    const submission = await prisma.campaignSubmission.create({
      data: {
        name: name.trim(),
        dob: dob.trim().slice(0, 10),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        instaId: cleanInsta
      }
    });

    res.status(201).json({ message: 'Submission successful', submission: { id: submission.id } });
  } catch (error) {
    console.error('Error submitting campaign form:', error);
    res.status(500).json({ error: 'Failed to submit campaign form. Please try again.' });
  }
});

module.exports = router;
