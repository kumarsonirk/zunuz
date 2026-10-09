import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';
import AccountLayout from '../../components/store/AccountLayout';
import AddressForm from '../../components/store/AddressForm';
import { cardCls, primaryBtnCls, BtnSweep } from '../../components/store/StoreShell';
import Seo from '../../components/Seo';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { addressLine } from '../../utils/address';

// Saved addresses (/account/addresses): cards with edit / delete (inline
// "are you sure?") / make default; add or edit with the shared AddressForm.
// `location.state.returnTo` (e.g. from an older checkout link) sends the
// customer back there after adding one.
export default function AddressesPage() {
  const { customer } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | address
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  useEffect(() => {
    if (!customer) return;
    api.get('/customers/addresses').then(setList).catch((e) => { setError(e.message || 'Could not load addresses.'); setList([]); });
  }, [customer]);

  useEffect(() => {
    if (!flash) return undefined;
    const t = setTimeout(() => setFlash(''), 2600);
    return () => clearTimeout(t);
  }, [flash]);

  const sortDefault = (arr) => [...arr].sort((a, b) => b.isDefault - a.isDefault);

  const saved = (a) => {
    const wasNew = editing === 'new';
    setList((cur) => sortDefault([a, ...cur.filter((x) => x.id !== a.id).map((x) => (a.isDefault ? { ...x, isDefault: false } : x))]));
    setEditing(null);
    setFlash(wasNew ? 'Address added' : 'Address updated');
    const returnTo = location.state?.returnTo;
    if (wasNew && returnTo) navigate(returnTo, { state: { selectedAddressId: a.id } });
  };

  const remove = async (a) => {
    setBusyId(a.id); setError('');
    try {
      await api.delete(`/customers/addresses/${a.id}`);
      const el = document.getElementById(`addr-${a.id}`);
      const drop = () => { setList((cur) => cur.filter((x) => x.id !== a.id)); setConfirmId(null); setFlash('Address removed'); };
      if (el && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.to(el, { opacity: 0, scale: 0.94, duration: 0.3, ease: 'power2.in', onComplete: drop });
      else drop();
    } catch (e) {
      // Addresses used by past orders can't be deleted (they're the order's record).
      setError(/foreign|constraint|server error/i.test(e.message || '') ? 'This address is linked to a past order, so it can’t be deleted — you can edit it instead.' : (e.message || 'Could not delete.'));
      setConfirmId(null);
    } finally { setBusyId(null); }
  };

  const makeDefault = async (a) => {
    setBusyId(a.id); setError('');
    try {
      const { id, customerId, createdAt, ...rest } = a; // eslint-disable-line no-unused-vars
      const updated = await api.put(`/customers/addresses/${a.id}`, { ...rest, email: rest.email || customer.email, landmark: rest.landmark || '-', isDefault: true });
      setList((cur) => sortDefault(cur.map((x) => (x.id === a.id ? updated : { ...x, isDefault: false }))));
      setFlash('Default address updated');
    } catch (e) { setError(e.message || 'Could not update.'); }
    finally { setBusyId(null); }
  };

  return (
    <AccountLayout
      title="Addresses"
      subtitle="Where should we send the sparkle?"
      action={!editing && list && (
        <button type="button" onClick={() => setEditing('new')} className={primaryBtnCls}><BtnSweep /><Plus size={18} /> Add address</button>
      )}
    >
      <Seo title="Saved addresses" path="/account/addresses" noindex />
      {flash && <p role="status" className="m-0 mb-4 inline-flex items-center gap-2 rounded-full bg-[#E8F7EE] px-4 py-2 font-['Inter',sans-serif] text-[14px] font-semibold text-[#1E8A4C] animate-[jw-rise_0.4s_cubic-bezier(0.16,1,0.3,1)_both]"><Check size={16} /> {flash}</p>}
      {error && <p role="alert" className="m-0 mb-4 rounded-[14px] bg-[#FFE0EA] px-4 py-3 font-['Inter',sans-serif] text-[14px] text-[#B4123E]">{error}</p>}

      {editing ? (
        <section className={`ac-in p-[clamp(18px,2.4vw,28px)] ${cardCls}`}>
          <h2 className="m-0 mb-5 text-[22px] font-bold">{editing === 'new' ? 'New address' : 'Edit address'}</h2>
          <AddressForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            customer={customer}
            makeDefault={!list?.length}
            onSaved={saved}
            onCancel={() => setEditing(null)}
          />
        </section>
      ) : list === null ? (
        <div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">{[0, 1].map((i) => <div key={i} className="h-[150px] animate-pulse rounded-[24px] bg-white/60" />)}</div>
      ) : list.length === 0 ? (
        <div className={`ac-in flex flex-col items-center px-6 py-12 text-center ${cardCls}`}>
          <span aria-hidden="true" className="flex size-16 animate-cp-bob items-center justify-center rounded-full bg-[#D6E6FF] text-[30px]">🏠</span>
          <p className="m-0 mt-4 text-[22px] font-bold">No saved addresses</p>
          <p className="m-0 mt-1 font-['Inter',sans-serif] text-[15px] text-[#111110]/60">Add one now and checkout gets quicker.</p>
          <button type="button" onClick={() => setEditing('new')} className={`${primaryBtnCls} mt-5`}><BtnSweep /><Plus size={18} /> Add address</button>
        </div>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 max-[700px]:grid-cols-1">
          {list.map((a) => (
            <li key={a.id} id={`addr-${a.id}`} className={`ac-in flex flex-col p-5 ${cardCls} ${a.isDefault ? 'ring-2 ring-[#FF3D8B]' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[17px] font-bold">{a.name}</span>
                <span className="rounded-full bg-[#111110]/6 px-2 py-0.5 font-['Inter',sans-serif] text-[11px] font-bold tracking-wide text-[#111110]/65 uppercase">{a.label}</span>
                {a.isDefault && <span className="rounded-full bg-[#FF3D8B] px-2 py-0.5 font-['Inter',sans-serif] text-[11px] font-bold text-white">Default</span>}
              </div>
              <p className="m-0 mt-2 flex-1 font-['Inter',sans-serif] text-[14px] leading-snug text-[#111110]/70">{addressLine(a)}</p>
              <p className="m-0 mt-1 font-['Inter',sans-serif] text-[13px] text-[#111110]/55">+91 {a.phone}{a.email ? ` · ${a.email}` : ''}</p>
              {confirmId === a.id ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[14px] bg-[#FFE0EA] p-3 animate-[jw-rise_0.3s_ease-out_both]">
                  <span className="flex-1 font-['Inter',sans-serif] text-[14px] font-semibold text-[#B4123E]">Delete this address?</span>
                  <button type="button" disabled={busyId === a.id} onClick={() => remove(a)} className="cursor-pointer rounded-full border-0 bg-[#E8304F] px-4 py-1.5 font-['Inter',sans-serif] text-[13px] font-bold text-white disabled:opacity-50">{busyId === a.id ? 'Deleting…' : 'Delete'}</button>
                  <button type="button" onClick={() => setConfirmId(null)} className="cursor-pointer rounded-full border-0 bg-white px-4 py-1.5 font-['Inter',sans-serif] text-[13px] font-bold text-[#111110]">Keep</button>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2 font-['Inter',sans-serif] text-[13px] font-bold">
                  <button type="button" onClick={() => setEditing(a)} className="flex cursor-pointer items-center gap-1.5 rounded-full border-0 bg-[#111110]/6 px-3.5 py-2 text-[#111110] transition-colors hover:bg-[#111110] hover:text-white"><Pencil size={14} /> Edit</button>
                  <button type="button" onClick={() => setConfirmId(a.id)} className="flex cursor-pointer items-center gap-1.5 rounded-full border-0 bg-[#111110]/6 px-3.5 py-2 text-[#111110] transition-colors hover:bg-[#E8304F] hover:text-white"><Trash2 size={14} /> Delete</button>
                  {!a.isDefault && <button type="button" disabled={busyId === a.id} onClick={() => makeDefault(a)} className="cursor-pointer rounded-full border-0 bg-transparent px-2 py-2 text-[#1A6FE8] hover:underline disabled:opacity-50">Make default</button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AccountLayout>
  );
}
