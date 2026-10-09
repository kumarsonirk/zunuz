const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/customerAuth');
const settings = require('../lib/settings');
const referrals = require('../lib/referrals');

// Refer & Earn (customer side). Rules in lib/referrals.js.
//   GET /check?code=   public — is this a real code? (+ referrer's first name)
//   GET /me            signed in — my code, link, stats and friends

// Throttled so codes can't be enumerated.
const checkLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts — try again in a few minutes.' } });

router.get('/check', checkLimiter, async (req, res) => {
  try {
    if (!settings.get().referralEnabled) return res.json({ valid: false, name: null });
    const referrer = await referrals.findReferrer(req.query.code);
    res.set('Cache-Control', 'no-store');
    res.json({ valid: !!referrer, name: referrer ? referrals.firstName(referrer.name) : null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await referrals.summaryFor(req.customer.id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
