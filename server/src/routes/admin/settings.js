const router = require('express').Router();
const settings = require('../../lib/settings');

// GET/PUT /api/admin/settings (needs the "settings" permission).
const { adminSecurityAnswerHash, ...publicDefaults } = settings.DEFAULTS; // eslint-disable-line no-unused-vars
router.get('/', (req, res) => res.json({ settings: settings.forAdmin(), defaults: publicDefaults }));

const SECURITY_KEYS = ['adminSecurityQuestion', 'adminSecurityAnswer', 'clearSecurityAnswer', 'adminSecurityAnswerHash'];

router.put('/', async (req, res) => {
  const body = { ...(req.body || {}) };
  delete body.adminSecurityAnswerHash; // never set directly
  const touchesSecurity = SECURITY_KEYS.some((k) => k in body && !(k === 'adminSecurityQuestion' && body[k] === settings.get().adminSecurityQuestion) && !(k === 'adminSecurityAnswer' && !String(body[k] || '').trim()));
  if (touchesSecurity && !req.adminAccess?.role?.isSystem) {
    return res.status(403).json({ error: 'Only a Super Admin can change the admin login security question.' });
  }
  try {
    const { settings: saved, changed } = await settings.update(body);
    if (changed.length) res.locals.activitySummary = `Updated settings: ${changed.map((k) => (settings.LABELS[k] || k).toLowerCase()).join(', ')}`;
    else res.locals.skipActivity = true;
    res.json({ settings: saved, changed });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Could not save settings.' });
  }
});

module.exports = router;
