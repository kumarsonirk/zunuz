const router = require('express').Router();
const { Prisma } = require('@prisma/client');
const auth = require('../../middleware/adminAuth');
const { requirePermission } = require('../../lib/adminPermissions');

const prisma = require('../../lib/prisma');

// Admin statistics.
//   GET /api/admin/stats?period=all|today|7d|30d|90d|year  → dashboard numbers
//   GET /api/admin/stats/badges                           → sidebar counts
//g
// Definitions (kept in one place so every card agrees):
//   "real" order  = COD (any payment status) or online with payment PAID.
//                   Abandoned / failed online checkouts are not orders.
//   revenue       = sum of real orders' totals, excluding CANCELLED.
//   awaiting pay  = online orders whose payment is still PENDING.
const PERIODS = {
  all: null,
  today: 'today',
  '7d': 7,
  '30d': 30,
  '90d': 90,
  year: 'year',
};

function since(period) {
  const p = PERIODS[period];
  if (p === undefined || p === null) return null;
  const d = new Date();
  if (p === 'today') { d.setHours(0, 0, 0, 0); return d; }
  if (p === 'year') return new Date(d.getFullYear(), 0, 1);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (p - 1));
  return d;
}

const REAL = { OR: [{ paymentMethod: 'COD' }, { paymentStatus: 'PAID' }] };
const settings = require('../../lib/settings');
const lowStockLevel = () => settings.get().lowStockThreshold;
const STOREFRONT_CATEGORIES = ['necklaces', 'bracelets', 'earrings'];

// Page loads + unique visitors since `from` (null = all time).
async function traffic(from) {
  const rows = from
    ? await prisma.$queryRaw(Prisma.sql`SELECT COUNT(*) AS views, COUNT(DISTINCT visitorId) AS visitors FROM PageView WHERE createdAt >= ${from}`)
    : await prisma.$queryRaw(Prisma.sql`SELECT COUNT(*) AS views, COUNT(DISTINCT visitorId) AS visitors FROM PageView`);
  return { views: Number(rows[0]?.views || 0), visitors: Number(rows[0]?.visitors || 0) };
}

// Email delivery numbers for the period + orders still waiting for their
// confirmation email (only counting orders placed since logging began).
async function emailStats(inPeriod) {
  const [groups, typeGroups, first, recentFailures] = await Promise.all([
    prisma.emailLog.groupBy({ by: ['status'], _count: { _all: true }, where: inPeriod }),
    prisma.emailLog.groupBy({ by: ['type'], _count: { _all: true }, where: { ...inPeriod, status: { in: ['SENT', 'SIMULATED'] } } }),
    prisma.emailLog.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    prisma.emailLog.findMany({ where: { status: 'FAILED' }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, type: true, to: true, error: true, orderId: true, createdAt: true } }),
  ]);
  const by = Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
  let awaiting = 0;
  if (first) {
    const confirmed = await prisma.emailLog.findMany({ where: { type: 'ORDER_CONFIRMATION', status: { in: ['SENT', 'SIMULATED'] }, orderId: { not: null } }, select: { orderId: true }, distinct: ['orderId'] });
    awaiting = await prisma.order.count({
      where: { AND: [REAL, { status: { not: 'CANCELLED' } }, { createdAt: { gte: first.createdAt } }, { id: { notIn: confirmed.map((c) => c.orderId) } }] },
    });
  }
  return {
    sent: (by.SENT || 0) + (by.SIMULATED || 0),
    simulated: by.SIMULATED || 0,
    failed: by.FAILED || 0,
    awaiting,
    byType: Object.fromEntries(typeGroups.map((g) => [g.type, g._count._all])),
    trackingSince: first?.createdAt || null,
    recentFailures,
  };
}

router.get('/', auth, requirePermission('stats'), async (req, res) => {
  const period = PERIODS[req.query.period] !== undefined ? req.query.period : 'all';
  const from = since(period);
  const inPeriod = from ? { createdAt: { gte: from } } : {};
  const real = { AND: [REAL, inPeriod] };
  try {
    const [
      orders, revenueAgg, statusGroups, methodGroups, awaitingPayment, failedPayments,
      itemsAgg, customersTotal, customersNew, productsTotal, productsActive, outOfStock, lowStock,
      categories, reviewsAgg, orderRatingsAgg, recentOrders, topItems, seriesOrders, campaign, expiringCoupons,
    ] = await Promise.all([
      prisma.order.count({ where: real }),
      prisma.order.aggregate({ _sum: { total: true }, _avg: { total: true }, where: { AND: [REAL, inPeriod, { status: { not: 'CANCELLED' } }] } }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true }, where: real }),
      prisma.order.groupBy({ by: ['paymentMethod'], _count: { _all: true }, _sum: { total: true }, where: { AND: [REAL, inPeriod, { status: { not: 'CANCELLED' } }] } }),
      prisma.order.count({ where: { paymentMethod: 'RAZORPAY', paymentStatus: 'PENDING', ...inPeriod } }),
      prisma.order.count({ where: { paymentMethod: 'RAZORPAY', paymentStatus: 'FAILED', ...inPeriod } }),
      prisma.orderItem.aggregate({ _sum: { quantity: true }, where: { order: { AND: [REAL, inPeriod, { status: { not: 'CANCELLED' } }] } } }),
      prisma.customer.count(),
      prisma.customer.count({ where: inPeriod }),
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true, stock: { lte: 0 } } }),
      prisma.product.count({ where: { isActive: true, stock: { gt: 0, lte: lowStockLevel() } } }),
      prisma.category.findMany({ select: { id: true, name: true, slug: true, _count: { select: { products: true } } }, orderBy: { order: 'asc' } }),
      prisma.productReview.aggregate({ _count: { _all: true }, _avg: { rating: true }, where: inPeriod }),
      prisma.review.aggregate({ _count: { _all: true }, _avg: { rating: true }, where: inPeriod }),
      prisma.order.findMany({
        where: real, take: 6, orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true, email: true } }, items: { select: { quantity: true } } },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'], _sum: { quantity: true },
        where: { order: { AND: [REAL, inPeriod, { status: { not: 'CANCELLED' } }] } },
        orderBy: { _sum: { quantity: 'desc' } }, take: 5,
      }),
      // Revenue series: daily for short periods, monthly otherwise.
      prisma.order.findMany({
        where: { AND: [REAL, { status: { not: 'CANCELLED' } }, period === 'all' || period === 'year' || period === '90d' ? inPeriod : { createdAt: { gte: since('30d') } }] },
        select: { createdAt: true, total: true },
      }),
      prisma.campaignSubmission.count({ where: inPeriod }).catch(() => 0),
      prisma.coupon.findMany({
        where: {
          isActive: true,
          expiresAt: { not: null, gt: new Date(), lte: new Date(Date.now() + 24 * 864e5) },
        },
        orderBy: { expiresAt: 'asc' },
        select: { id: true, code: true, type: true, value: true, expiresAt: true, usedCount: true, usageLimit: true },
      }),
    ]);

    const midnight = since('today');
    const [trafficToday, traffic7d, trafficPeriod, topPagesRaw, firstView, email] = await Promise.all([
      traffic(midnight),
      traffic(since('7d')),
      traffic(from),
      prisma.pageView.groupBy({ by: ['path'], _count: { _all: true }, where: { createdAt: { gte: since('7d') } }, orderBy: { _count: { path: 'desc' } }, take: 5 }),
      prisma.pageView.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      emailStats(inPeriod),
    ]);

    const topProducts = topItems.length
      ? await prisma.product.findMany({ where: { id: { in: topItems.map((t) => t.productId) } }, select: { id: true, name: true, image: true, price: true, stock: true } })
      : [];
    const top = topItems.map((t) => ({ ...topProducts.find((p) => p.id === t.productId), sold: t._sum.quantity || 0 })).filter((p) => p.id);

    // Build the chart buckets.
    const monthly = period === 'all' || period === 'year' || period === '90d';
    const buckets = new Map();
    if (monthly) {
      const start = period === 'all'
        ? (seriesOrders.length ? new Date(Math.min(...seriesOrders.map((o) => o.createdAt.getTime()))) : new Date())
        : from;
      const d = new Date(start.getFullYear(), start.getMonth(), 1);
      const end = new Date();
      // Always show at least 6 months so the chart isn't a single bar.
      const minStart = new Date(end.getFullYear(), end.getMonth() - 5, 1);
      const first = d < minStart ? d : minStart;
      for (let m = new Date(first); m <= end; m.setMonth(m.getMonth() + 1)) {
        buckets.set(`${m.getFullYear()}-${m.getMonth()}`, { label: m.toLocaleString('en-IN', { month: 'short' }) + (m.getMonth() === 0 ? ` ${String(m.getFullYear()).slice(2)}` : ''), revenue: 0, orders: 0 });
      }
      seriesOrders.forEach((o) => {
        const b = buckets.get(`${o.createdAt.getFullYear()}-${o.createdAt.getMonth()}`);
        if (b) { b.revenue += o.total; b.orders += 1; }
      });
    } else {
      const days = 30;
      const start = since('30d');
      for (let i = 0; i < days; i += 1) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        buckets.set(d.toDateString(), { label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), revenue: 0, orders: 0 });
      }
      seriesOrders.forEach((o) => {
        const b = buckets.get(new Date(o.createdAt).toDateString());
        if (b) { b.revenue += o.total; b.orders += 1; }
      });
    }

    const status = Object.fromEntries(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => [s, 0]));
    statusGroups.forEach((g) => { status[g.status] = g._count._all; });
    const byMethod = Object.fromEntries(methodGroups.map((g) => [g.paymentMethod, { orders: g._count._all, revenue: g._sum.total || 0 }]));

    res.json({
      period,
      from,
      revenue: revenueAgg._sum.total || 0,
      avgOrderValue: Math.round(revenueAgg._avg.total || 0),
      orders,
      status,
      byMethod: { online: byMethod.RAZORPAY || { orders: 0, revenue: 0 }, cod: byMethod.COD || { orders: 0, revenue: 0 } },
      awaitingPayment,
      failedPayments,
      itemsSold: itemsAgg._sum.quantity || 0,
      customers: { total: customersTotal, new: customersNew },
      products: { total: productsTotal, active: productsActive, outOfStock, lowStock, lowStockAt: lowStockLevel() },
      categories: categories.map((c) => ({ ...c, products: c._count.products, storefront: STOREFRONT_CATEGORIES.includes(c.slug), _count: undefined })),
      reviews: { products: reviewsAgg._count._all, productAvg: reviewsAgg._avg.rating, orders: orderRatingsAgg._count._all, orderAvg: orderRatingsAgg._avg.rating },
      campaignSignups: campaign,
      series: { granularity: monthly ? 'month' : 'day', points: [...buckets.values()] },
      topProducts: top,
      recentOrders,
      traffic: {
        today: trafficToday,
        last7Days: traffic7d,
        period: trafficPeriod,
        topPages: topPagesRaw.map((t) => ({ path: t.path, views: t._count._all })),
        trackingSince: firstView?.createdAt || null,
      },
      email,
      expiringCoupons,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sidebar badges: things that need attention + totals.
router.get('/badges', auth, async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 864e5);
    const [toProcess, customers, products, outOfStock, reviews, reviewsPending, returnsPending, abandoned, couponsExpiring] = await Promise.all([
      prisma.order.count({ where: { AND: [REAL, { status: { in: ['PENDING', 'CONFIRMED'] } }] } }),
      prisma.customer.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true, stock: { lte: 0 } } }),
      prisma.productReview.count(),
      prisma.productReview.count({ where: { isApproved: false } }),
      prisma.returnRequest.count({ where: { status: 'PENDING' } }),
      // Online checkouts not paid in the last 7 days (abandoned / failed).
      prisma.order.count({ where: { paymentMethod: 'RAZORPAY', paymentStatus: { in: ['PENDING', 'FAILED'] }, createdAt: { gte: weekAgo } } }),
      prisma.coupon.count({
        where: {
          isActive: true,
          expiresAt: { not: null, gt: new Date(), lte: new Date(Date.now() + 24 * 864e5) },
        },
      }),
    ]);
    res.json({ toProcess, customers, products, outOfStock, reviews, reviewsPending, returnsPending, abandoned, couponsExpiring });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
