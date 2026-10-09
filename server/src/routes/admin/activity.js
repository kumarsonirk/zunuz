const router = require('express').Router();

const prisma = require('../../lib/prisma');

// GET /api/admin/activity?page=&limit=&section=&adminId=&action=&search=
// (needs the "activity" permission — see src/index.js).
router.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const { section, adminId, action, search } = req.query;
  const where = {
    ...(section ? { section: String(section) } : {}),
    ...(adminId ? { adminId: Number(adminId) } : {}),
    ...(action ? { action: String(action) } : {}),
    ...(search ? { OR: [{ summary: { contains: String(search) } }, { adminName: { contains: String(search) } }, { adminEmail: { contains: String(search) } }] } : {}),
  };
  try {
    const [entries, total, admins, today] = await Promise.all([
      prisma.adminActivity.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.adminActivity.count({ where }),
      prisma.adminActivity.groupBy({ by: ['adminId', 'adminName'], _count: { _all: true } }),
      prisma.adminActivity.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    ]);
    res.json({
      entries,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      today,
      admins: admins.filter((a) => a.adminId != null).map((a) => ({ id: a.adminId, name: a.adminName, count: a._count._all })),
    });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
