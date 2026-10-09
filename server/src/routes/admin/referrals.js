const router = require('express').Router();
const referrals = require('../../lib/referrals');

const prisma = require('../../lib/prisma');

// Admin → Referrals (needs the 'customers' permission; activity-logged).
//   GET /?status=JOINED|REWARDED|REJECTED&search=&page=   list + stats
//   PUT /:id { action: 'approve' | 'reject', reason? }
// approve = credit the referrer now (skips the delivery wait — e.g. a
// customer-care decision); reject = mark it not eligible (reason required).

const STATUSES = ['JOINED', 'REWARDED', 'REJECTED'];
const person = (c) => (c ? { id: c.id, name: c.name, email: c.email } : null);

router.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  try {
    const and = [];
    if (STATUSES.includes(req.query.status)) and.push({ status: req.query.status });
    const search = String(req.query.search || '').trim().slice(0, 100);
    if (search) {
      const people = await prisma.customer.findMany({ where: { OR: [{ name: { contains: search } }, { email: { contains: search } }, { referralCode: { contains: search.toUpperCase() } }] }, select: { id: true }, take: 200 });
      const ids = people.map((p) => p.id);
      and.push({ OR: [{ referrerId: { in: ids } }, { refereeId: { in: ids } }] });
    }
    const where = and.length ? { AND: and } : {};
    const [rows, total, counts, issued, spent, outstanding] = await Promise.all([
      prisma.referral.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.referral.count({ where }),
      prisma.referral.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.creditTransaction.aggregate({ where: { amount: { gt: 0 }, type: { in: ['REFERRAL_REWARD', 'FRIEND_BONUS'] } }, _sum: { amount: true } }),
      prisma.creditTransaction.aggregate({ where: { type: 'SPENT' }, _sum: { amount: true } }),
      prisma.creditTransaction.aggregate({ where: { amount: { gt: 0 }, remaining: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, _sum: { remaining: true } }),
    ]);
    const returned = await prisma.creditTransaction.aggregate({ where: { type: 'RETURNED' }, _sum: { amount: true } });
    const ids = [...new Set(rows.flatMap((r) => [r.referrerId, r.refereeId]))];
    const people = new Map((ids.length ? await prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }) : []).map((c) => [c.id, c]));
    const count = (s) => counts.find((c) => c.status === s)?._count._all || 0;
    res.json({
      items: rows.map((r) => ({
        id: r.id, status: r.status, createdAt: r.createdAt, rewardedAt: r.rewardedAt, orderId: r.orderId,
        reward: r.reward, friendBonus: r.friendBonus, rejectReason: r.rejectReason,
        referrer: person(people.get(r.referrerId)), referee: person(people.get(r.refereeId)),
      })),
      total, page, pages: Math.max(1, Math.ceil(total / limit)),
      stats: {
        total: counts.reduce((s, c) => s + c._count._all, 0),
        joined: count('JOINED'), rewarded: count('REWARDED'), rejected: count('REJECTED'),
        creditsIssued: issued._sum.amount || 0,
        creditsSpent: Math.max(0, -(spent._sum.amount || 0) - (returned._sum.amount || 0)),
        creditsOutstanding: outstanding._sum.remaining || 0,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { action } = req.body || {};
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 255) : '';
  if (!Number.isInteger(id) || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid request' });
  if (action === 'reject' && !reason) return res.status(400).json({ error: 'Add a reason for rejecting this referral.' });
  try {
    const ref = await prisma.referral.findUnique({ where: { id } });
    if (!ref) return res.status(404).json({ error: 'Referral not found' });
    if (ref.status !== 'JOINED') return res.status(409).json({ error: `This referral is already ${ref.status.toLowerCase()}.` });
    const ok = action === 'approve' ? await referrals.reward(ref, ref.orderId, { by: 'admin' }) : await referrals.reject(ref, reason);
    if (!ok) return res.status(409).json({ error: 'This referral was just updated — refresh and try again.' });
    res.locals.activitySummary = action === 'approve' ? `Approved referral #${id} — referrer credited` : `Rejected referral #${id} (${reason})`;
    res.json(await prisma.referral.findUnique({ where: { id } }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
