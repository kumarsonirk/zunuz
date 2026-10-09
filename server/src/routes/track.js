const router = require('express').Router();
const express = require('express');
const rateLimit = require('express-rate-limit');

const prisma = require('../lib/prisma');

// POST /api/track — one storefront page load. The body is sent as
// text/plain JSON ({ path, visitorId }) so browsers don't need a CORS
// preflight; it's parsed here. Always answers 204 (tracking must never
// affect the page). Bots and admin paths are ignored.
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|curl|wget|python|node-fetch|axios/i;
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: false, legacyHeaders: false });

router.post('/', limiter, express.text({ type: '*/*', limit: '2kb' }), async (req, res) => {
  res.status(204).end();
  try {
    if (BOT.test(req.get('user-agent') || '')) return;
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const path = String(body.path || '').slice(0, 255);
    const visitorId = String(body.visitorId || '').replace(/[^\w-]/g, '').slice(0, 64);
    if (!path.startsWith('/') || path.startsWith('/admin') || !visitorId) return;
    await prisma.pageView.create({ data: { path, visitorId } });
  } catch { /* bad payload — ignore */ }
});

module.exports = router;
