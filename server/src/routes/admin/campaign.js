const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../../middleware/adminAuth');

const prisma = new PrismaClient();

// Get all campaign submissions with search and pagination
router.get('/', auth, async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  try {
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { instaId: { contains: search } }
          ]
        }
      : {};

    const [submissions, total] = await Promise.all([
      prisma.campaignSubmission.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.campaignSubmission.count({ where })
    ]);

    res.json({
      submissions,
      total,
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Error fetching campaign submissions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a campaign submission manually from admin
router.post('/', auth, async (req, res) => {
  try {
    const { name, dob, email, phone, insta_id } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!dob || !dob.trim()) return res.status(400).json({ error: 'Date of birth is required' });
    const dobYear = parseInt(dob.trim().split('-')[0], 10);
    if (isNaN(dobYear) || dobYear < 1920 || dobYear > new Date().getFullYear()) {
      return res.status(400).json({ error: 'Please select a valid birth year' });
    }
    if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required' });

    if (!insta_id || !insta_id.trim()) return res.status(400).json({ error: 'Instagram ID is required' });

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

    res.status(201).json(submission);
  } catch (error) {
    console.error('Error creating campaign submission:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a campaign submission
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { name, dob, email, phone, insta_id } = req.body;

  try {
    const existing = await prisma.campaignSubmission.findUnique({
      where: { id: Number(id) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Campaign submission not found' });
    }

    const cleanInsta = insta_id ? (insta_id.trim().startsWith('@') ? insta_id.trim() : `@${insta_id.trim()}`) : existing.instaId;

    const updated = await prisma.campaignSubmission.update({
      where: { id: Number(id) },
      data: {
        name: name ? name.trim() : existing.name,
        dob: dob ? dob.trim() : existing.dob,
        email: email ? email.trim().toLowerCase() : existing.email,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : existing.phone,
        instaId: cleanInsta
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating campaign submission:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a campaign submission
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.campaignSubmission.delete({
      where: { id: Number(id) }
    });
    res.json({ message: 'Campaign submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign submission:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
