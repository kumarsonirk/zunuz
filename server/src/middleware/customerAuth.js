const jwt = require('jsonwebtoken');

const prisma = require('../lib/prisma');

// Every request re-checks the customer's tokenVersion so a password reset (or
// a hijacked-account cleanup) signs out older sessions. Cached per customer
// for a few seconds to avoid a DB hit on every call; invalidate(id) drops the
// entry as soon as the version changes.
const CACHE_TTL_MS = 15 * 1000;
const cache = new Map(); // customerId -> { tokenVersion, expires }

function invalidate(id) {
  cache.delete(Number(id));
}

async function currentTokenVersion(id) {
  const hit = cache.get(id);
  if (hit && hit.expires > Date.now()) return hit.tokenVersion;
  const row = await prisma.customer.findUnique({ where: { id }, select: { id: true, tokenVersion: true } });
  if (!row) { cache.delete(id); return null; }
  // Keep the map from growing unbounded on a long-lived process.
  if (cache.size > 5000) {
    const now = Date.now();
    for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
  }
  cache.set(id, { tokenVersion: row.tokenVersion, expires: Date.now() + CACHE_TTL_MS });
  return row.tokenVersion;
}

// Returns the login payload for a bearer token, or null if it isn't a valid,
// current customer session. Reset / verify-email tokens (anything carrying an
// `action` claim) are never accepted as logins.
async function verifyCustomerToken(token) {
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
  if (!payload || typeof payload !== 'object' || payload.action) return null;
  const id = Number(payload.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const tokenVersion = await currentTokenVersion(id);
  if (tokenVersion === null) return null;
  // Tokens issued before versioning have no tv — treat them as version 0.
  if ((payload.tv ?? 0) !== tokenVersion) return null;
  return { ...payload, id };
}

async function customerAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const payload = await verifyCustomerToken(auth.slice(7));
    if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
    req.customer = payload;
    next();
  } catch (e) {
    console.error('customerAuth failed:', e);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = customerAuth;
module.exports.invalidate = invalidate;
module.exports.verifyCustomerToken = verifyCustomerToken;
