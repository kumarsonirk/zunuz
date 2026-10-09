
const prisma = require('./prisma');

// Admin permissions — one key per admin section. Roles store a JSON array
// of these keys; the "Super Admin" system role (and any admin without a
// role, i.e. accounts created before roles existed) gets all of them.
const PERMISSIONS = [
  { key: 'stats', label: 'Statistics', description: 'Dashboard numbers, revenue, traffic and email delivery' },
  { key: 'products', label: 'Products', description: 'Add, edit, hide and delete products' },
  { key: 'categories', label: 'Categories', description: 'Main categories and product types' },
  { key: 'reviews', label: 'Reviews', description: 'Edit and delete product reviews' },
  { key: 'orders', label: 'Orders', description: 'View orders, change status, invoices' },
  { key: 'customers', label: 'Customers', description: 'Customer accounts and their history' },
  { key: 'campaign', label: 'Campaign', description: 'Campaign form submissions' },
  { key: 'returns', label: 'Returns', description: 'Damaged / wrong item requests from customers' },
  { key: 'coupons', label: 'Coupons', description: 'Create and manage discount codes' },
  { key: 'content', label: 'Homepage & Banners', description: 'Edit storefront text, banners and the announcement bar' },
  { key: 'reports', label: 'Reports & Exports', description: 'Sales reports, CSV exports and bulk product import' },
  { key: 'team', label: 'Users & Roles', description: 'Add admins, assign roles, edit permissions' },
  { key: 'activity', label: 'Activity Log', description: 'See what every admin changed' },
  { key: 'settings', label: 'Settings', description: 'Payments, delivery fee, maintenance mode, contact details' },
];
const ALL = PERMISSIONS.map((p) => p.key);

const parsePermissions = (raw) => {
  try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v.filter((k) => ALL.includes(k)) : []; } catch { return []; }
};

// Short cache so every admin request doesn't hit the DB for the role.
const cache = new Map(); // adminId → { at, access }
const TTL = 15 * 1000;
function invalidateAdminAccess(adminId) {
  if (adminId == null) cache.clear(); else cache.delete(Number(adminId));
}

async function getAdminAccess(adminId) {
  const hit = cache.get(adminId);
  if (hit && Date.now() - hit.at < TTL) return hit.access;
  const admin = await prisma.admin.findUnique({ where: { id: adminId }, include: { role: true } });
  let access = null;
  if (admin) {
    const full = !admin.role || admin.role.isSystem;
    access = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      isActive: admin.isActive,
      role: admin.role ? { id: admin.role.id, name: admin.role.name, isSystem: admin.role.isSystem } : { id: null, name: 'Super Admin', isSystem: true },
      permissions: full ? ALL : parsePermissions(admin.role.permissions),
    };
  }
  cache.set(adminId, { at: Date.now(), access });
  return access;
}

// Route guard: 403 unless the signed-in admin has `key`.
// `readWith`: extra keys that also allow GET requests (e.g. the Products
// page needs to read categories for its dropdowns).
const requirePermission = (key, { readWith = [] } = {}) => (req, res, next) => {
  if (!req.adminAccess) return res.status(401).json({ error: 'Not signed in' });
  const keys = req.method === 'GET' ? [key, ...readWith] : [key];
  if (!keys.some((k) => req.adminAccess.permissions.includes(k))) return res.status(403).json({ error: "You don't have permission to do this." });
  next();
};

// ── Activity log ──
function logActivity({ admin, action, section, entityId = null, summary, ip = null }) {
  prisma.adminActivity.create({
    data: {
      adminId: admin?.id ?? null,
      adminName: String(admin?.name || 'Unknown').slice(0, 120),
      adminEmail: String(admin?.email || '').slice(0, 255),
      action: String(action).slice(0, 30),
      section: String(section).slice(0, 40),
      entityId: entityId == null ? null : String(entityId).slice(0, 60),
      summary: String(summary).slice(0, 500),
      ip: ip ? String(ip).slice(0, 64) : null,
    },
  }).catch((e) => console.error('AdminActivity write failed:', e.message));
}

const ENTITY = {
  products: 'product', categories: 'category', reviews: 'review', orders: 'order',
  customers: 'customer', campaign: 'campaign entry', team: 'team', upload: 'image', settings: 'settings',
  returns: 'return request', coupons: 'coupon', content: 'storefront content', reports: 'report', pincodes: 'pincode', notes: 'note', abandoned: 'checkout reminder',
};
const VERB = { POST: 'Created', PUT: 'Updated', PATCH: 'Updated', DELETE: 'Deleted' };
const ACTION = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };

// Readable one-liner for a successful admin write.
function describe(section, req, path) {
  const parts = path.split('/').filter(Boolean); // e.g. ['12'] or ['12','status'] or ['subcategories','3']
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const id = parts.find((p) => /^\d+$/.test(p)) || null;
  const verb = VERB[req.method] || req.method;
  let entity = ENTITY[section] || section;
  if (section === 'categories') entity = parts[0] === 'subcategories' ? 'product type' : 'category';
  if (section === 'team') entity = parts[0] === 'roles' ? 'role' : 'admin user';
  const name = b.name || b.title || null;
  let summary;
  if (section === 'orders' && parts[1] === 'status' && b.status) summary = `Changed order #${id} status to ${String(b.status).toLowerCase()}`;
  else if (section === 'orders' && parts[1] === 'send-email') summary = `Sent the confirmation email for order #${id}`;
  else summary = `${verb} ${entity}${id ? ` #${id}` : ''}${name ? ` “${String(name).slice(0, 80)}”` : ''}`;
  return { summary, entityId: id };
}

// Middleware: after a successful POST/PUT/PATCH/DELETE under an admin
// section, record it. Mounted per section in src/index.js.
const activityLogger = (section) => (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const path = req.path; // relative to the section mount; captured before routing rewrites req.url
  res.on('finish', () => {
    if (res.statusCode >= 400 || !req.adminAccess || res.locals.skipActivity) return;
    // A route can supply its own wording via res.locals.activitySummary.
    const auto = describe(section, req, path);
    const summary = res.locals.activitySummary || auto.summary;
    const { entityId } = auto;
    logActivity({ admin: req.adminAccess, action: ACTION[req.method], section, entityId, summary, ip: req.ip });
  });
  next();
};

module.exports = { PERMISSIONS, ALL, parsePermissions, getAdminAccess, invalidateAdminAccess, requirePermission, logActivity, activityLogger };
