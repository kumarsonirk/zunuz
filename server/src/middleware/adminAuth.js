const jwt = require('jsonwebtoken');
const { getAdminAccess } = require('../lib/adminPermissions');

// Verifies the admin JWT, then loads the admin's role + permissions
// (cached briefly) onto req.adminAccess. Deleted or deactivated admins are
// rejected even if their token hasn't expired yet.
module.exports = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    req.admin = jwt.verify(auth.slice(7), process.env.JWT_ADMIN_SECRET, { algorithms: ['HS256'] });
    // Only admin login tokens (never a customer / reset / verify token).
    if (req.admin?.role !== 'admin' || req.admin.action) throw new Error('Not an admin token');
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
  try {
    if (!req.adminAccess) {
      const access = await getAdminAccess(Number(req.admin.id));
      if (!access || !access.isActive) return res.status(401).json({ error: 'This admin account is no longer active' });
      req.adminAccess = access;
    }
    next();
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
};
