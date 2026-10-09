const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { PERMISSIONS, ALL, parsePermissions, invalidateAdminAccess } = require('../../lib/adminPermissions');

const prisma = require('../../lib/prisma');

// Users & Roles (/api/admin/team, needs the "team" permission — see
// src/index.js). Safety rules: you can't delete or deactivate yourself, and
// there must always be at least one active Super Admin.
//
// Escalation guard: the "team" permission alone must never lead to Super
// Admin powers. Only a Super Admin can create / promote / edit / delete a
// Super Admin, change their own role, or hand out permissions they don't
// hold; other team managers can only manage regular admins, can't touch the
// role they themselves have, and can only grant permissions they have.
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicAdmin = (a) => ({
  id: a.id, name: a.name, email: a.email, isActive: a.isActive, lastLoginAt: a.lastLoginAt, createdAt: a.createdAt,
  role: a.role ? { id: a.role.id, name: a.role.name, isSystem: a.role.isSystem } : { id: null, name: 'Super Admin', isSystem: true },
  locked: !!(a.lockedUntil && a.lockedUntil > new Date()),
});
const isSuper = (a) => !a.role || a.role.isSystem;
const callerIsSuper = (req) => !!req.adminAccess?.role?.isSystem;
const ONLY_SUPER = 'Only a Super Admin can do that.';
// Would this roleId (null / missing = Super Admin) make someone a Super Admin?
async function grantsSuper(roleId) {
  if (!roleId) return true;
  const role = await prisma.adminRole.findUnique({ where: { id: Number(roleId) } });
  return !!role?.isSystem;
}
// Is this role (null / system = Super Admin) within the caller's own
// permissions? Non-super team managers may only create / edit / delete
// admins whose role gives nothing they don't have themselves.
const roleWithinCaller = (req, role) => {
  if (callerIsSuper(req)) return true;
  if (!role || role.isSystem) return false;
  const mine = req.adminAccess?.permissions || [];
  return parsePermissions(role.permissions).every((k) => mine.includes(k));
};
const loadRole = (roleId) => (roleId ? prisma.adminRole.findUnique({ where: { id: Number(roleId) } }) : null);
const BEYOND_YOU = "That role has permissions you don't have — ask a Super Admin.";

// Non-super callers may only grant permissions they hold themselves.
const exceedsCaller = (req, list) => !callerIsSuper(req)
  && (Array.isArray(list) ? list : []).some((k) => ALL.includes(k) && !(req.adminAccess?.permissions || []).includes(k));

async function activeSuperAdmins(exceptId) {
  const admins = await prisma.admin.findMany({ where: { isActive: true, ...(exceptId ? { id: { not: exceptId } } : {}) }, include: { role: true } });
  return admins.filter(isSuper).length;
}

router.get('/permissions', (req, res) => res.json(PERMISSIONS));

// ── Admin users ──
router.get('/admins', async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({ include: { role: true }, orderBy: { createdAt: 'asc' } });
    res.json(admins.map(publicAdmin));
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/admins', async (req, res) => {
  const { name, email, password, roleId } = req.body;
  if (!name?.trim() || !emailRe.test(email || '')) return res.status(400).json({ error: 'Enter a name and a valid email.' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  try {
    if (roleId && !(await prisma.adminRole.findUnique({ where: { id: Number(roleId) } }))) return res.status(400).json({ error: 'Role not found.' });
    if (!callerIsSuper(req) && (await grantsSuper(roleId))) return res.status(403).json({ error: `${ONLY_SUPER} Pick a role other than Super Admin.` });
    if (!roleWithinCaller(req, await loadRole(roleId))) return res.status(403).json({ error: BEYOND_YOU });
    const admin = await prisma.admin.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), passwordHash: await bcrypt.hash(password, 10), roleId: roleId ? Number(roleId) : null },
      include: { role: true },
    });
    res.status(201).json(publicAdmin(admin));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'An admin with this email already exists.' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/admins/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, password, roleId, isActive } = req.body;
  try {
    const current = await prisma.admin.findUnique({ where: { id }, include: { role: true } });
    if (!current) return res.status(404).json({ error: 'Admin not found.' });
    const self = id === req.adminAccess.id;
    if (!callerIsSuper(req)) {
      if (isSuper(current)) return res.status(403).json({ error: `${ONLY_SUPER} (editing a Super Admin)` });
      if (roleId !== undefined && self) return res.status(403).json({ error: "You can't change your own role." });
      if (roleId !== undefined && (await grantsSuper(roleId))) return res.status(403).json({ error: `${ONLY_SUPER} (making someone a Super Admin)` });
      if (!self && !roleWithinCaller(req, current.role)) return res.status(403).json({ error: "That admin has permissions you don't have — ask a Super Admin." });
      if (roleId !== undefined && !roleWithinCaller(req, await loadRole(roleId))) return res.status(403).json({ error: BEYOND_YOU });
    }
    const data = {};
    if (name !== undefined) { if (!name.trim()) return res.status(400).json({ error: 'Name is required.' }); data.name = name.trim(); }
    if (email !== undefined) { if (!emailRe.test(email)) return res.status(400).json({ error: 'Enter a valid email.' }); data.email = email.trim().toLowerCase(); }
    if (password) { if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' }); data.passwordHash = await bcrypt.hash(password, 10); data.failedAttempts = 0; data.lockedUntil = null; }
    let nextRole = current.role;
    if (roleId !== undefined) {
      nextRole = roleId ? await prisma.adminRole.findUnique({ where: { id: Number(roleId) } }) : null;
      if (roleId && !nextRole) return res.status(400).json({ error: 'Role not found.' });
      data.roleId = roleId ? Number(roleId) : null;
    }
    if (isActive !== undefined) data.isActive = !!isActive;

    if (self && data.isActive === false) return res.status(400).json({ error: "You can't deactivate your own account." });
    const losesSuper = isSuper(current) && current.isActive && (data.isActive === false || (nextRole && !nextRole.isSystem));
    if (losesSuper && (await activeSuperAdmins(id)) === 0) return res.status(400).json({ error: 'There must always be at least one active Super Admin.' });

    const admin = await prisma.admin.update({ where: { id }, data, include: { role: true } });
    invalidateAdminAccess(id);
    res.json(publicAdmin(admin));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'An admin with this email already exists.' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/admins/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.adminAccess.id) return res.status(400).json({ error: "You can't delete your own account." });
  try {
    const current = await prisma.admin.findUnique({ where: { id }, include: { role: true } });
    if (!current) return res.status(404).json({ error: 'Admin not found.' });
    if (!callerIsSuper(req) && isSuper(current)) return res.status(403).json({ error: `${ONLY_SUPER} (deleting a Super Admin)` });
    if (!roleWithinCaller(req, current.role)) return res.status(403).json({ error: "That admin has permissions you don't have — ask a Super Admin." });
    if (isSuper(current) && current.isActive && (await activeSuperAdmins(id)) === 0) return res.status(400).json({ error: 'There must always be at least one active Super Admin.' });
    await prisma.admin.delete({ where: { id } });
    invalidateAdminAccess(id);
    res.json({ message: 'Admin deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── Roles ──
const publicRole = (r) => ({
  id: r.id, name: r.name, description: r.description, isSystem: r.isSystem,
  permissions: r.isSystem ? ALL : parsePermissions(r.permissions),
  admins: r._count?.admins ?? 0, updatedAt: r.updatedAt,
});

router.get('/roles', async (req, res) => {
  try {
    const roles = await prisma.adminRole.findMany({ include: { _count: { select: { admins: true } } }, orderBy: [{ isSystem: 'desc' }, { name: 'asc' }] });
    res.json(roles.map(publicRole));
  } catch { res.status(500).json({ error: 'Server error' }); }
});

const cleanPerms = (list) => JSON.stringify((Array.isArray(list) ? list : []).filter((k) => ALL.includes(k)));

router.post('/roles', async (req, res) => {
  const { name, description, permissions } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Role name is required.' });
  if (exceedsCaller(req, permissions)) return res.status(403).json({ error: "You can only grant permissions you have yourself." });
  try {
    const role = await prisma.adminRole.create({
      data: { name: name.trim().slice(0, 60), description: description?.trim()?.slice(0, 255) || null, permissions: cleanPerms(permissions) },
      include: { _count: { select: { admins: true } } },
    });
    res.status(201).json(publicRole(role));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'A role with this name already exists.' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/roles/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, permissions } = req.body;
  try {
    const role = await prisma.adminRole.findUnique({ where: { id } });
    if (!role) return res.status(404).json({ error: 'Role not found.' });
    if (role.isSystem) return res.status(400).json({ error: 'The Super Admin role always has every permission and can’t be edited.' });
    if (!callerIsSuper(req) && req.adminAccess?.role?.id === role.id) return res.status(403).json({ error: "You can't edit the role you're in — ask a Super Admin." });
    if (permissions !== undefined && exceedsCaller(req, permissions)) return res.status(403).json({ error: 'You can only grant permissions you have yourself.' });
    if (name !== undefined && !name.trim()) return res.status(400).json({ error: 'Role name is required.' });
    const updated = await prisma.adminRole.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim().slice(0, 60) } : {}),
        ...(description !== undefined ? { description: description?.trim()?.slice(0, 255) || null } : {}),
        ...(permissions !== undefined ? { permissions: cleanPerms(permissions) } : {}),
      },
      include: { _count: { select: { admins: true } } },
    });
    invalidateAdminAccess(null);
    res.json(publicRole(updated));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'A role with this name already exists.' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/roles/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const role = await prisma.adminRole.findUnique({ where: { id }, include: { _count: { select: { admins: true } } } });
    if (!role) return res.status(404).json({ error: 'Role not found.' });
    if (role.isSystem) return res.status(400).json({ error: 'The Super Admin role can’t be deleted.' });
    if (role._count.admins) return res.status(400).json({ error: `${role._count.admins} admin(s) still have this role — move them to another role first.` });
    await prisma.adminRole.delete({ where: { id } });
    res.json({ message: 'Role deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
