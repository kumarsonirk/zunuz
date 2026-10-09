const router = require('express').Router();
const { pincodeServiceability } = require('../lib/stock');

// GET /api/pincodes/:pin → { pincode, valid, serviceable, codAvailable,
//   etaDays, city, state, restricted, listed }
// Used by the product page "Check delivery" box, the address form hint and
// checkout. Order creation applies the same rules (lib/stock.js).
router.get('/:pin', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await pincodeServiceability(req.params.pin));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not check this pincode right now.' });
  }
});

module.exports = router;
