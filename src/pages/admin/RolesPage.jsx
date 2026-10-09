import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Plus, Pencil, Trash2, Lock, Users, Check, X } from 'lucide-react';
import { PageHeader, Button, IconButton, Badge, Field, Modal, ConfirmDialog, EmptyState, Card } from '../../components/admin/AdminUI';
import { DISPLAY, inputCls, textareaCls, tableWrapCls, tableCls, thCls, tdCls, trCls } from '../../components/admin/adminStyles';
import { api } from '../../utils/api';

// Roles (/admin/roles): named permission sets for admin users. "Super
// Admin" is built in (every permission, locked). The server enforces the
// same permissions on every admin API route.
function RoleForm({ initial, permissions, onSaved, onClose }) {
  const [f, setF] = useState(() => ({ name: initial?.name || '', description: initial?.description || '', permissions: initial?.permissions || [] }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toggle = (key) => setF((s) => ({ ...s, permissions: s.permissions.includes(key) ? s.permissions.filter((k) => k !== key) : [...s.permissions, key] }));
  const all = f.permissions.length === permissions.length;

  const save = async () => {
    setError('');
    if (!f.name.trim()) { setError('Give the role a name.'); return; }
    setBusy(true);
    try {
      const saved = initial ? await api.put(`/admin/team/roles/${initial.id}`, f, true) : await api.post('/admin/team/roles', f, true);
      onSaved(saved);
    } catch (e) { setError(e.message || 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? `Edit “${initial.name}”` : 'New role'}
      subtitle="Pick which parts of the admin panel this role can use."
      width={640}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>{initial ? 'Save role' : 'Create role'}</Button></>}
    >
      <div className="flex flex-col gap-4">
        <Field label="Role name"><input className={inputCls} value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Order Manager" maxLength={60} /></Field>
        <Field label="Description (optional)"><textarea className={textareaCls} rows={2} value={f.description} onChange={(e) => setF((s) => ({ ...s, description: e.target.value }))} maxLength={255} placeholder="What is this role for?" /></Field>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[var(--admin-text-muted)]">Permissions ({f.permissions.length}/{permissions.length})</span>
            <button type="button" onClick={() => setF((s) => ({ ...s, permissions: all ? [] : permissions.map((p) => p.key) }))} className="cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-[var(--admin-accent)] hover:underline">{all ? 'Clear all' : 'Select all'}</button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-[560px]:grid-cols-1">
            {permissions.map((p) => {
              const on = f.permissions.includes(p.key);
              return (
                <button
                  key={p.key}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(p.key)}
                  className={`flex cursor-pointer items-start gap-3 rounded-[12px] border p-3 text-left transition-colors ${on ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]' : 'border-[var(--admin-border-3)] bg-[var(--admin-bg)] hover:border-[var(--admin-border-5)]'}`}
                >
                  <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2 transition-colors ${on ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)] text-white' : 'border-[var(--admin-border-5)]'}`}>{on && <Check size={13} strokeWidth={3.5} />}</span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-[var(--admin-text)]">{p.label}</span>
                    <span className="block text-[12px] leading-snug text-[var(--admin-text-muted)]">{p.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {error && <p role="alert" className="m-0 rounded-[12px] bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] font-medium text-[var(--tone-red)]">{error}</p>}
      </div>
    </Modal>
  );
}

export default function RolesPage() {
  const [roles, setRoles] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => Promise.all([api.get('/admin/team/roles', true), api.get('/admin/team/permissions', true)])
    .then(([r, p]) => { setRoles(r); setPermissions(p); setError(''); })
    .catch((e) => { setError(e.message || 'Could not load roles.'); setRoles((cur) => cur || []); }), []);
  useEffect(() => { load(); }, [load]);

  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/admin/team/roles/${deleting.id}`, true); setDeleting(null); load(); }
    catch (e) { setError(e.message || 'Could not delete.'); setDeleting(null); }
    finally { setBusy(false); }
  };
  const label = (key) => permissions.find((p) => p.key === key)?.label || key;

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageHeader title="Roles" subtitle="Control what each admin can see and change." actions={<Button icon={Plus} onClick={() => setEditing('new')} disabled={!permissions.length}>New role</Button>} />

      {error && <p role="alert" className="m-0 mb-4 rounded-[12px] bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] font-medium text-[var(--tone-red)]">{error}</p>}

      {roles === null ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">{[0, 1, 2].map((i) => <div key={i} className="h-[220px] animate-pulse rounded-[18px] bg-[var(--admin-hover-3)]" />)}</div>
      ) : roles.length === 0 ? (
        <Card><EmptyState icon={ShieldCheck} title="No roles yet" text="Run server/scripts/setup-admin-roles.js to create the starter roles." /></Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-4">
          {roles.map((r, i) => (
            <Card key={r.id} className="flex flex-col p-6 animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <span className={`flex size-11 items-center justify-center rounded-full ${r.isSystem ? 'bg-[var(--admin-accent)] text-white' : 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]'}`}>{r.isSystem ? <Lock size={19} /> : <ShieldCheck size={20} />}</span>
                {!r.isSystem && (
                  <span className="flex gap-2">
                    <IconButton label={`Edit ${r.name}`} icon={Pencil} onClick={() => setEditing(r)} />
                    <IconButton label={`Delete ${r.name}`} icon={Trash2} tone="danger" onClick={() => setDeleting(r)} />
                  </span>
                )}
              </div>
              <h2 className={`m-0 mt-4 text-[20px] font-bold text-[var(--admin-text)] ${DISPLAY}`}>{r.name}</h2>
              <p className="m-0 mt-1 min-h-[40px] text-[14px] leading-snug text-[var(--admin-text-muted)]">{r.description || '—'}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {r.isSystem ? <Badge tone="pink">All permissions · can't be edited</Badge>
                  : r.permissions.length ? r.permissions.map((k) => <Badge key={k} tone="green">{label(k)}</Badge>) : <Badge tone="muted">No permissions</Badge>}
              </div>
              <p className="m-0 mt-auto flex items-center gap-1.5 border-t border-[var(--admin-border-2)] pt-4 text-[13px] text-[var(--admin-text-muted)]" style={{ marginTop: 18 }}>
                <Users size={15} /> {r.admins} admin{r.admins === 1 ? '' : 's'}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Permission matrix */}
      {roles?.length > 0 && permissions.length > 0 && (
        <section className="mt-9">
          <h2 className={`m-0 mb-4 text-[19px] font-bold ${DISPLAY}`}>Permission overview</h2>
          <div className={tableWrapCls}>
            <div className="overflow-x-auto">
              <table className={tableCls}>
                <thead><tr><th className={thCls}>Permission</th>{roles.map((r) => <th key={r.id} className={`${thCls} text-center`}>{r.name}</th>)}</tr></thead>
                <tbody>
                  {permissions.map((p) => (
                    <tr key={p.key} className={trCls}>
                      <td className={tdCls}><span className="block font-semibold text-[var(--admin-text)]">{p.label}</span><span className="block text-[12px] text-[var(--admin-text-muted)]">{p.description}</span></td>
                      {roles.map((r) => (
                        <td key={r.id} className={`${tdCls} text-center`}>
                          {r.permissions.includes(p.key)
                            ? <Check size={18} strokeWidth={3} className="inline text-[var(--tone-green)]" aria-label="Allowed" />
                            : <X size={16} className="inline text-[var(--admin-text-faint)]" aria-label="Not allowed" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {editing && (
        <RoleForm
          initial={editing === 'new' ? null : editing}
          permissions={permissions}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Delete role?"
        message={deleting && (deleting.admins ? `${deleting.admins} admin(s) still have “${deleting.name}”. Move them to another role first.` : `“${deleting.name}” will be removed.`)}
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
