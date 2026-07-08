const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/customerAuth');

const prisma = new PrismaClient();

// GET /api/customers/me
router.get('/me', auth, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.customer.id },
      select: { id: true, name: true, email: true, phone: true, createdAt: true }
    });
    res.json(customer);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/customers/me
// Phone is deliberately not updatable here — it's the OTP-verified login identity,
// and changing it without re-verifying ownership would let an account be silently
// re-pointed to a different number.
router.put('/me', auth, async (req, res) => {
  const { name, email } = req.body;
  try {
    const customer = await prisma.customer.update({
      where: { id: req.customer.id },
      data: { name, email: email || null },
      select: { id: true, name: true, email: true, phone: true }
    });
    res.json(customer);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/customers/addresses
router.get('/addresses', auth, async (req, res) => {
  try {
    const addresses = await prisma.address.findMany({ where: { customerId: req.customer.id }, orderBy: { isDefault: 'desc' } });
    res.json(addresses);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/customers/addresses
router.post('/addresses', auth, async (req, res) => {
  const { label, name, phone, email, houseNo, street, landmark, city, state, pincode, isDefault } = req.body;
  if (!name || !phone || !email || !houseNo || !street || !landmark || !city || !state || !pincode) {
    return res.status(400).json({ error: 'All address fields are required.' });
  }
  try {
    if (isDefault) {
      await prisma.address.updateMany({ where: { customerId: req.customer.id }, data: { isDefault: false } });
    }
    const address = await prisma.address.create({
      data: {
        customerId: req.customer.id, label: label || 'Home',
        name, phone, email, houseNo, street, landmark,
        city, state, pincode, isDefault: isDefault || false
      }
    });
    res.status(201).json(address);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/customers/addresses/:id
router.put('/addresses/:id', auth, async (req, res) => {
  const { label, name, phone, email, houseNo, street, landmark, city, state, pincode, isDefault } = req.body;
  if (!name || !phone || !email || !houseNo || !street || !landmark || !city || !state || !pincode) {
    return res.status(400).json({ error: 'All address fields are required.' });
  }
  try {
    const existing = await prisma.address.findFirst({ where: { id: Number(req.params.id), customerId: req.customer.id } });
    if (!existing) return res.status(404).json({ error: 'Address not found' });
    if (isDefault) {
      await prisma.address.updateMany({ where: { customerId: req.customer.id }, data: { isDefault: false } });
    }
    const address = await prisma.address.update({
      where: { id: Number(req.params.id) },
      data: {
        label, name, phone, email, houseNo, street, landmark,
        city, state, pincode, isDefault: isDefault || false
      }
    });
    res.json(address);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/customers/addresses/:id
router.delete('/addresses/:id', auth, async (req, res) => {
  try {
    const existing = await prisma.address.findFirst({ where: { id: Number(req.params.id), customerId: req.customer.id } });
    if (!existing) return res.status(404).json({ error: 'Address not found' });
    await prisma.address.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Address deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
