const router = require('express').Router();
const auth = require('../middleware/customerAuth');
const credits = require('../lib/credits');
const referrals = require('../lib/referrals');

// GET /api/credits/me — my ZUNUZ Credits: balance, referral rewards still to
// come, credit expiring in the next 30 days, and history.
router.get('/me', auth, async (req, res) => {
  try {
    const [w, pending] = await Promise.all([credits.wallet(req.customer.id), referrals.pendingFor(req.customer.id)]);
    res.set('Cache-Control', 'no-store');
    res.json({ balance: w.balance, pending, expiringSoon: w.expiringSoon, history: w.history });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
