import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { UserPlus, Pencil, Trash2, Users, UserCheck, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { PageHeader, StatRow, Button, IconButton, Badge, Field, Select, Modal, ConfirmDialog, EmptyState, SkeletonRows, Toggle } from '../../components/admin/AdminUI';
import { DISPLAY, inputCls, tableWrapCls, tableCls, thCls, tdCls, trCls } from '../../components/admin/adminStyles';
import { api } from '../../utils/api';

// Admin users (/admin/users): who can sign in to the admin panel and with
// which role. Server rules (team.js): can't delete/deactivate yourself;
// there's always at least one active Super Admin.
const EMPTY = { name: '', email: '', password: '', roleId: '', isActive: true };
const PERM_LABELS = { stats: 'Statistics', products: 'Products', categories: 'Categories', reviews: 'Reviews', orders: 'Orders', customers: 'Customers', campaign: 'Campaign', team: 'Users & Roles', activity: 'Activity Log' };
const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Never');

function AdminForm({ initial, roles, isSelf, onSaved, onClose }) {
  const [f, setF] = useState(() => (initial ? { name: initial.name, email: initial.email, password: '', roleId: initial.role?.id ? String(initial.role.id) : '', isActive: initial.isActive } : { ...EMPTY, roleId: String(roles.find((r) => !r.isSystem)?.id || roles[0]?.id || '') }));
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e?.target ? e.target.value : e }));
  const role = roles.find((r) => String(r.id) === f.roleId);

  const save = async (e) => {
    e?.preventDefault();
    setError('');
    if (!f.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { setError('Enter a name and a valid email.'); return; }
    if (!initial && f.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (initial && f.password && f.password.length < 8) { setError('New password must be at least 8 characters.'); return; }
    setBusy(true);
    try {
      const body = { name: f.name, email: f.email, roleId: f.roleId ? Number(f.roleId) : null, ...(f.password ? { password: f.password } : {}), ...(initial ? { isActive: f.isActive } : {}) };
      const saved = initial ? await api.put(`/admin/team/admins/${initial.id}`, body, true) : await api.post('/admin/team/admins', body, true);
      onSaved(saved);
    } catch (err) { setError(err.message || 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? 'Edit admin' : 'Add admin'}
      subtitle={initial ? initial.email : 'They sign in at /admin/login with this email and password.'}
      width={560}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>{initial ? 'Save changes' : 'Add admin'}</Button></>}
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <Field label="Full name"><input className={inputCls} value={f.name} onChange={set('name')} autoComplete="off" /></Field>
          <Field label="Email"><input className={inputCls} type="email" value={f.email} onChange={set('email')} autoComplete="off" /></Field>
        </div>
        <Field label="Role" hint={role ? (role.isSystem ? 'Full access to everything.' : role.description || `${role.permissions.length} permissions`) : ''}>
          <Select value={f.roleId} onChange={set('roleId')} disabled={isSelf && initial?.role?.isSystem}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
        {role && !role.isSystem && (
          <div className="flex flex-wrap gap-1.5">{role.permissions.length ? role.permissions.map((p) => <Badge key={p} tone="green">{PERM_LABELS[p] || p}</Badge>) : <Badge tone="muted">No permissions</Badge>}</div>
        )}
        <Field label={initial ? 'New password (optional)' : 'Password'} hint={initial ? 'Leave empty to keep the current password.' : 'At least 8 characters — share it with them securely.'}>
          <span className="relative block">
            <input className={`${inputCls} pr-11`} type={showPw ? 'text' : 'password'} value={f.password} onChange={set('password')} autoComplete="new-password" />
            <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'} className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]">
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </Field>
        {initial && !isSelf && (
          <div className="flex items-center justify-between rounded-[12px] border border-[var(--admin-border-2)] bg-[var(--admin-bg)] px-4 py-3">
            <span>
              <span className="block text-[14px] font-semibold">Account active</span>
              <span className="block text-[12px] text-[var(--admin-text-muted)]">Deactivated admins can't sign in; existing sessions stop working.</span>
            </span>
            <Toggle checked={f.isActive} onChange={(v) => setF((s) => ({ ...s, isActive: v }))} />
          </div>
        )}
        {error && <p role="alert" className="m-0 rounded-[12px] bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] font-medium text-[var(--tone-red)]">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  const { me } = useOutletContext() || {};
  const [admins, setAdmins] = useState(null);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | admin
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => Promise.all([api.get('/admin/team/admins', true), api.get('/admin/team/roles', true)])
    .then(([a, r]) => { setAdmins(a); setRoles(r); setError(''); })
    .catch((e) => { setError(e.message || 'Could not load admins.'); setAdmins((cur) => cur || []); }), []);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const list = admins || [];
    return [
      { label: 'Admins', value: list.length, icon: Users, sub: `${roles.length} roles available`, tone: 'blue' },
      { label: 'Active', value: list.filter((a) => a.isActive).length, icon: UserCheck, sub: `${list.filter((a) => !a.isActive).length} deactivated`, tone: 'green' },
      { label: 'Super Admins', value: list.filter((a) => a.role?.isSystem).length, icon: ShieldCheck, sub: 'Full access', tone: 'pink' },
      { label: 'Locked', value: list.filter((a) => a.locked).length, icon: Lock, sub: 'After 5 wrong passwords', tone: list.some((a) => a.locked) ? 'red' : 'muted' },
    ];
  }, [admins, roles]);

  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/admin/team/admins/${deleting.id}`, true); setDeleting(null); load(); }
    catch (e) { setError(e.message || 'Could not delete.'); setDeleting(null); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageHeader title="Users" subtitle="People who can sign in to this admin panel." actions={<Button icon={UserPlus} onClick={() => setEditing('new')} disabled={!roles.length}>Add admin</Button>}>
        <StatRow items={stats} />
      </PageHeader>

      {error && <p role="alert" className="m-0 mb-4 rounded-[12px] bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] font-medium text-[var(--tone-red)]">{error}</p>}

      <div className={tableWrapCls}>
        {admins === null ? <SkeletonRows rows={3} /> : admins.length === 0 ? (
          <EmptyState icon={Users} title="No admins yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead><tr>{['Admin', 'Role', 'Status', 'Last sign-in', 'Added', ''].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody>
                {admins.map((a, i) => {
                  const self = a.id === me?.id;
                  return (
                    <tr key={a.id} className={`${trCls} animate-[jw-rise_0.45s_cubic-bezier(0.16,1,0.3,1)_both]`} style={{ animationDelay: `${i * 40}ms` }}>
                      <td className={tdCls}>
                        <span className="flex items-center gap-3">
                          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${a.role?.isSystem ? 'bg-[var(--admin-accent)] text-white' : 'bg-[var(--admin-accent-soft)] text-[var(--tone-pink)]'}`}>{(a.name || a.email)[0].toUpperCase()}</span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 font-semibold text-[var(--admin-text)]">{a.name}{self && <Badge tone="blue">You</Badge>}</span>
                            <span className="block text-[13px] text-[var(--admin-text-muted)]">{a.email}</span>
                          </span>
                        </span>
                      </td>
                      <td className={tdCls}><Badge tone={a.role?.isSystem ? 'pink' : 'purple'}>{a.role?.name}</Badge></td>
                      <td className={tdCls}>{!a.isActive ? <Badge tone="muted" dot>Deactivated</Badge> : a.locked ? <Badge tone="red" dot>Locked</Badge> : <Badge tone="green" dot>Active</Badge>}</td>
                      <td className={`${tdCls} whitespace-nowrap text-[var(--admin-text-muted)]`}>{fmt(a.lastLoginAt)}</td>
                      <td className={`${tdCls} whitespace-nowrap text-[var(--admin-text-muted)]`}>{new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className={`${tdCls} text-right`}>
                        <span className="inline-flex gap-2">
                          <IconButton label={`Edit ${a.name}`} icon={Pencil} onClick={() => setEditing(a)} />
                          <IconButton label={`Delete ${a.name}`} icon={Trash2} tone="danger" disabled={self} onClick={() => setDeleting(a)} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className={`m-0 mt-4 text-[13px] text-[var(--admin-text-muted)]`}>
        <span className={`font-semibold ${DISPLAY}`}>Tip:</span> what each role can do is set on the Roles page. Changes apply within a few seconds — no need to sign out.
      </p>

      {editing && (
        <AdminForm
          initial={editing === 'new' ? null : editing}
          roles={roles}
          isSelf={editing !== 'new' && editing.id === me?.id}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Delete admin?"
        message={deleting && `${deleting.name} (${deleting.email}) won't be able to sign in any more. Their past activity stays in the Activity Log.`}
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
