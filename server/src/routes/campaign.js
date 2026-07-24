const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Submit campaign application ("Shine with Us")
router.post('/submit', async (req, res) => {
  try {
    const { name, dob, email, phone, insta_id } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
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

    const cleanInsta = insta_id.trim().startsWith('@') ? insta_id.trim() : `@${insta_id.trim()}`;

    const submission = await prisma.campaignSubmission.create({
      data: {
        name: name.trim(),
        dob: dob.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        instaId: cleanInsta
      }
    });

    res.status(201).json({ message: 'Submission successful', submission });
  } catch (error) {
    console.error('Error submitting campaign form:', error);
    res.status(500).json({ error: 'Failed to submit campaign form. Please try again.' });
  }
});

module.exports = router;
