const router = require('express').Router();
const auth = require('../middleware/customerAuth');
const { sendVerificationEmail } = require('../lib/mail/verify');

const prisma = require('../lib/prisma');

// Request bodies are untrusted JSON: accept strings (and numbers for phone /
// pincode style fields), null for anything else so we can 400 instead of crash.
const asStr = (v) => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : null);
const isBlank = (v) => v === undefined || v === null || v === '';
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validates + normalises an address body. Returns { error } or { data }.
const ADDRESS_FIELDS = { label: 40, name: 100, phone: 20, email: 191, houseNo: 191, street: 191, landmark: 191, city: 100, state: 100, pincode: 10 };
function parseAddress(body) {
  const b = body || {};
  const data = {};
  for (const [k, max] of Object.entries(ADDRESS_FIELDS)) {
    if (isBlank(b[k])) { data[k] = ''; continue; }
    const v = asStr(b[k]);
    if (v === null) return { error: `${k} must be text` };
    data[k] = v.trim().slice(0, max);
  }
  const { label, ...required } = data;
  if (Object.values(required).some((v) => !v)) return { error: 'All address fields are required.' };
  data.label = label || 'Home';
  data.isDefault = b.isDefault === true || b.isDefault === 'true';
  return { data };
}
const parseId = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };

// GET /api/customers/me
router.get('/me', auth, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.customer.id },
      select: { id: true, name: true, email: true, phone: true, emailVerified: true, createdAt: true }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/customers/me/reviews — all product reviews this customer has
// written, across every product, for the "My Reviews" account section.
router.get('/me/reviews', auth, async (req, res) => {
  try {
    const reviews = await prisma.productReview.findMany({
      where: { customerId: req.customer.id },
      include: { product: { select: { id: true, name: true, image: true, slug: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/customers/me
// Changing the email marks it unverified and emails a fresh verification link.
router.put('/me', auth, async (req, res) => {
  const body = req.body || {};
  for (const k of ['name', 'email', 'phone']) {
    if (!isBlank(body[k]) && asStr(body[k]) === null) return res.status(400).json({ error: `${k} must be text` });
  }
  const name = asStr(body.name)?.trim().slice(0, 100) || null;
  const email = asStr(body.email)?.trim() || null;

  if (email && (!emailRegex.test(email) || email.length > 191)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  let cleanPhone = null;
  if (!isBlank(body.phone)) {
    cleanPhone = asStr(body.phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Phone number must be a valid 10-digit number' });
    }
  }

  try {
    const current = await prisma.customer.findUnique({ where: { id: req.customer.id }, select: { email: true } });
    if (!current) return res.status(404).json({ error: 'Customer not found' });
    const emailChanged = (current.email || '').toLowerCase() !== (email || '').toLowerCase();

    const customer = await prisma.customer.update({
      where: { id: req.customer.id },
      data: { name, email, phone: cleanPhone, ...(emailChanged ? { emailVerified: false } : {}) },
      select: { id: true, name: true, email: true, phone: true, emailVerified: true }
    });
    if (emailChanged && customer.email) {
      sendVerificationEmail(customer).catch(err => console.error('Error sending verification email:', err));
    }
    res.json({ ...customer, verificationSent: emailChanged && !!customer.email });
  } catch (err) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.includes('phone') ? 'Phone number' : 'Email';
      return res.status(400).json({ error: `${field} already in use` });
    }
    console.error(err);
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
  const { error, data } = parseAddress(req.body);
  if (error) return res.status(400).json({ error });
  try {
    if (data.isDefault) {
      await prisma.address.updateMany({ where: { customerId: req.customer.id }, data: { isDefault: false } });
    }
    const address = await prisma.address.create({
      data: { customerId: req.customer.id, ...data }
    });
    res.status(201).json(address);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/customers/addresses/:id
router.put('/addresses/:id', auth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid address id' });
  const { error, data } = parseAddress(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const existing = await prisma.address.findFirst({ where: { id, customerId: req.customer.id } });
    if (!existing) return res.status(404).json({ error: 'Address not found' });
    if (data.isDefault) {
      await prisma.address.updateMany({ where: { customerId: req.customer.id }, data: { isDefault: false } });
    }
    const address = await prisma.address.update({
      where: { id },
      data
    });
    res.json(address);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/customers/addresses/:id
router.delete('/addresses/:id', auth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid address id' });
  try {
    const existing = await prisma.address.findFirst({ where: { id, customerId: req.customer.id } });
    if (!existing) return res.status(404).json({ error: 'Address not found' });
    await prisma.address.delete({ where: { id } });
    res.json({ message: 'Address deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
