const bcrypt = require('bcryptjs');

const prisma = require('./prisma');

// Store settings (admin Settings page). DEFAULTS are the values used until an
// admin changes something; only changed keys are stored (StoreSetting).
// Cached in memory: loaded at startup, refreshed every minute and right
// after a save, so reads are synchronous (get()) everywhere.
const DEFAULTS = {
  maintenanceMode: false,
  maintenanceMessage: "ZUNUZ is getting a little sparkle-up. We'll be back online shortly!",
  // Pause checkout: the store stays open (browse + add to bag) but no new
  // orders can be placed — e.g. while products are being added after launch.
  checkoutPaused: false,
  checkoutPausedMessage: "We're adding new pieces right now — checkout opens again very soon. Your bag is saved.",
  onlinePaymentsEnabled: true,
  codEnabled: false,
  deliveryFeeEnabled: true,
  deliveryFee: 70,
  freeDeliveryThreshold: 700,
  supportEmail: 'zunuzofficial@gmail.com',
  supportPhone: '+91 8310057566',
  supportWhatsapp: '918310057566',
  supportHours: 'Mon–Sat, 10 AM – 6 PM IST',
  lowStockThreshold: 5,
  // Customers can cancel from My orders for this many hours after ordering,
  // until the order ships (0 = only support can cancel).
  cancelWindowHours: 6,
  // Checkout extras
  pincodeRestriction: false, // only deliver to pincodes on the admin Pincodes list
  // Delivery time shown to shoppers (product page, address form, checkout):
  // pincodes on the Delivery Pincodes list (e.g. Bengaluru) vs everywhere
  // else. A listed pincode's own "Delivery time" overrides the first.
  listedPincodeEta: '48 hours',
  otherPincodeEta: '5–7 working days',
  // Alerts (lib/alerts.js)
  alertEmail: '',
  newOrderAlerts: true,
  lowStockAlerts: true,
  // Reviews
  reviewModeration: false, // new product reviews wait for admin approval
  // Announcement bar (top of every storefront page)
  announcementEnabled: false,
  announcementText: 'Free delivery on orders above ₹700 🎉',
  announcementLink: '',
  // Refer & Earn + ZUNUZ Credits (lib/referrals.js, lib/credits.js)
  referralEnabled: true,
  referralReward: 50, // ₹ credited to the referrer
  referralFriendBonus: 50, // ₹ credited to the friend on joining (after email verification)
  referralMinOrder: 299, // friend's first order (items total) needed for the referrer's reward
  referralMonthlyCap: 10, // rewarded referrals per referrer per calendar month
  creditExpiryDays: 180,
  // Admin Login Security (Question & Answer)
  adminSecurityQuestion: 'What is your store security code?',
  // Admin login security question. The answer is only ever stored as a
  // bcrypt hash (set it in Settings → Admin login security); empty = the
  // login page doesn't ask a question. Forgotten? Run
  // `node scripts/reset-admin-security-question.js` on the server.
  adminSecurityAnswerHash: '',
  // Navratri / Festive Bundle Offer ("Pick Any 3 @ ₹999")
  navratriOfferEnabled: true,
  navratriOfferTitle: 'Pick Any 3 @ ₹999',
  navratriBundlePrice: 999,
  navratriBundleCount: 3,
  navratriMinPrice: 499,
  navratriMaxPrice: 699,
};

// Validation per key → returns the cleaned value or throws a message.
const int = (min, max) => (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`must be a whole number between ${min} and ${max}`);
  return n;
};
const bool = (v) => !!v;
const str = (max, { required = false, re } = {}) => (v) => {
  const s = String(v ?? '').trim();
  if (required && !s) throw new Error('is required');
  if (s.length > max) throw new Error(`must be at most ${max} characters`);
  if (s && re && !re.test(s)) throw new Error('is not valid');
  return s;
};
const VALIDATE = {
  maintenanceMode: bool,
  maintenanceMessage: str(300, { required: true }),
  checkoutPaused: bool,
  checkoutPausedMessage: str(200, { required: true }),
  onlinePaymentsEnabled: bool,
  codEnabled: bool,
  deliveryFeeEnabled: bool,
  deliveryFee: int(0, 10000),
  freeDeliveryThreshold: int(0, 1000000),
  supportEmail: str(120, { required: true, re: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }),
  supportPhone: str(30, { required: true }),
  supportWhatsapp: str(20, { re: /^\d{8,15}$/ }),
  supportHours: str(80),
  lowStockThreshold: int(0, 1000),
  cancelWindowHours: int(0, 72),
  pincodeRestriction: bool,
  listedPincodeEta: str(30, { required: true }),
  otherPincodeEta: str(30, { required: true }),
  alertEmail: str(200, { re: /^([^\s@,]+@[^\s@,]+\.[^\s@,]+)(\s*,\s*[^\s@,]+@[^\s@,]+\.[^\s@,]+)*$/ }),
  newOrderAlerts: bool,
  lowStockAlerts: bool,
  reviewModeration: bool,
  announcementEnabled: bool,
  announcementText: str(140),
  announcementLink: str(300, { re: /^(\/(?!\/)|https?:\/\/)/ }), // not //other-site.com
  referralEnabled: bool,
  referralReward: int(0, 5000),
  referralFriendBonus: int(0, 5000),
  referralMinOrder: int(0, 100000),
  referralMonthlyCap: int(0, 1000),
  creditExpiryDays: int(1, 3650),
  adminSecurityQuestion: str(150, { required: true }),
  // adminSecurityAnswer is write-only input, hashed in update() below.
  navratriOfferEnabled: bool,
  navratriOfferTitle: str(100),
  navratriBundlePrice: int(1, 100000),
  navratriBundleCount: int(2, 20),
  navratriMinPrice: int(0, 100000),
  navratriMaxPrice: int(0, 100000),
};
const LABELS = {
  maintenanceMode: 'Maintenance mode', onlinePaymentsEnabled: 'Online payments', codEnabled: 'Cash on delivery', deliveryFeeEnabled: 'Delivery charge',
  maintenanceMessage: 'Maintenance message', checkoutPaused: 'Pause checkout', checkoutPausedMessage: 'Checkout paused message', deliveryFee: 'Delivery fee', freeDeliveryThreshold: 'Free delivery threshold',
  supportEmail: 'Support email', supportPhone: 'Support phone', supportWhatsapp: 'WhatsApp number', supportHours: 'Support hours',
  lowStockThreshold: 'Low stock threshold', cancelWindowHours: 'Cancellation window',
  pincodeRestriction: 'Pincode restriction', listedPincodeEta: 'Delivery time (listed pincodes)', otherPincodeEta: 'Delivery time (other pincodes)', alertEmail: 'Alert email', newOrderAlerts: 'New-order alerts', lowStockAlerts: 'Low-stock alerts',
  reviewModeration: 'Review moderation', announcementEnabled: 'Announcement bar', announcementText: 'Announcement text', announcementLink: 'Announcement link',
  referralEnabled: 'Referral program', referralReward: 'Referrer reward', referralFriendBonus: 'Friend bonus', referralMinOrder: 'Referral minimum order', referralMonthlyCap: 'Monthly referral cap', creditExpiryDays: 'Credit expiry',
  adminSecurityQuestion: 'Admin security question', adminSecurityAnswerHash: 'Admin security answer',
  navratriOfferEnabled: 'Navratri offer', navratriOfferTitle: 'Offer title',
  navratriBundlePrice: 'Bundle price', navratriBundleCount: 'Bundle item count',
  navratriMinPrice: 'Minimum item price', navratriMaxPrice: 'Maximum item price',
};
// What the storefront may read (GET /api/settings).
const PRIVATE_KEYS = ['lowStockThreshold', 'alertEmail', 'newOrderAlerts', 'lowStockAlerts', 'referralMonthlyCap', 'adminSecurityQuestion', 'adminSecurityAnswerHash'];
const PUBLIC_KEYS = Object.keys(DEFAULTS).filter((k) => !PRIVATE_KEYS.includes(k));

let current = { ...DEFAULTS };
let loadedAt = 0;

// The security answer was once saved in plain text (key adminSecurityAnswer):
// hash it into adminSecurityAnswerHash and delete the plain copy.
async function migratePlainAnswer(rows) {
  const plain = rows.find((r) => r.key === 'adminSecurityAnswer');
  if (!plain) return rows;
  let answer = '';
  try { answer = String(JSON.parse(plain.value) || ''); } catch { /* unreadable */ }
  const hasHash = rows.some((r) => r.key === 'adminSecurityAnswerHash');
  if (answer && !hasHash) {
    const value = JSON.stringify(await hashAnswer(answer));
    await prisma.storeSetting.upsert({ where: { key: 'adminSecurityAnswerHash' }, update: { value }, create: { key: 'adminSecurityAnswerHash', value } });
  }
  await prisma.storeSetting.delete({ where: { key: 'adminSecurityAnswer' } }).catch(() => {});
  return prisma.storeSetting.findMany();
}

const normalizeAnswer = (a) => String(a ?? '').trim().toLowerCase();
const hashAnswer = (a) => bcrypt.hash(normalizeAnswer(a), 10);
// Does this answer match the stored hash? (false when none is set)
async function checkSecurityAnswer(answer) {
  const hash = get().adminSecurityAnswerHash;
  if (!hash) return false;
  return bcrypt.compare(normalizeAnswer(answer), hash);
}

async function load() {
  try {
    const rows = await migratePlainAnswer(await prisma.storeSetting.findMany());
    const next = { ...DEFAULTS };
    rows.forEach((r) => { if (r.key in DEFAULTS) { try { next[r.key] = JSON.parse(r.value); } catch { /* keep default */ } } });
    current = next;
    loadedAt = Date.now();
  } catch (e) {
    console.error('Settings load failed (using defaults):', e.message);
  }
  return current;
}

function get() {
  if (Date.now() - loadedAt > 60 * 1000) load(); // refresh in the background
  return current;
}

const publicSettings = () => Object.fromEntries(PUBLIC_KEYS.map((k) => [k, get()[k]]));
// For the admin Settings page: everything except the answer hash (only
// whether one is set).
function forAdmin() {
  const { adminSecurityAnswerHash, ...rest } = get();
  return { ...rest, adminSecurityAnswerSet: !!adminSecurityAnswerHash };
}

// Validate + save a partial update. Throws Error(message) on bad input.
async function update(patch) {
  const clean = {};
  for (const [k, v] of Object.entries(patch || {})) {
    if (!(k in VALIDATE)) continue;
    try { clean[k] = VALIDATE[k](v); } catch (e) { throw new Error(`${LABELS[k] || k} ${e.message}.`); }
  }
  // Security answer: write-only — hashed here, never stored or returned as text.
  if (patch && patch.clearSecurityAnswer === true) clean.adminSecurityAnswerHash = '';
  else if (patch && typeof patch.adminSecurityAnswer === 'string' && patch.adminSecurityAnswer.trim()) {
    const a = patch.adminSecurityAnswer.trim();
    if (a.length < 4 || a.length > 150) throw new Error('The security answer must be 4–150 characters.');
    clean.adminSecurityAnswerHash = await hashAnswer(a);
  }
  const merged = { ...current, ...clean };
  if (!merged.onlinePaymentsEnabled && !merged.codEnabled) throw new Error('Keep at least one payment method switched on.');
  // Navratri combo: the price range must make sense, and the bundle price must
  // be below what the pieces cost on their own (else "Pick 3" saves nothing).
  if (merged.navratriMinPrice > merged.navratriMaxPrice) throw new Error('Navratri offer: the minimum item price can’t be above the maximum.');
  if (merged.navratriBundlePrice >= merged.navratriBundleCount * merged.navratriMaxPrice) {
    throw new Error(`Navratri offer: the bundle price must be below ₹${merged.navratriBundleCount * merged.navratriMaxPrice} (${merged.navratriBundleCount} × the maximum item price), or the combo saves nothing.`);
  }
  await prisma.$transaction(Object.entries(clean).map(([key, value]) => prisma.storeSetting.upsert({
    where: { key }, update: { value: JSON.stringify(value) }, create: { key, value: JSON.stringify(value) },
  })));
  const before = current;
  await load();
  // Keys whose value actually changed (for the activity log).
  const changed = Object.keys(clean).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(current[k]));
  return { settings: forAdmin(), changed };
}

load();

module.exports = { DEFAULTS, LABELS, get, load, update, publicSettings, forAdmin, checkSecurityAnswer };
