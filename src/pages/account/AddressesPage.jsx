import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Plus, Edit2, Trash2, X, Check, ChevronDown } from 'lucide-react';
import { api } from '../../utils/api';

const EMPTY = { label: 'Home', name: '', phone: '', email: '', houseNo: '', street: '', landmark: '', city: '', state: '', pincode: '', isDefault: false };

const inp = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px', color: '#F5F2EB', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: "'Grift', sans-serif" };

const LABELS = ['Home', 'Work', 'Other'];

function LabelPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: `1px solid ${open ? 'rgba(252,75,78,0.4)' : 'rgba(255,255,255,0.08)'}` }}
      >
        <span>{value}</span>
        <ChevronDown size={15} strokeWidth={1.5} color="#71717A" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#2A2B30', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          {LABELS.map(l => (
            <button
              key={l}
              type="button"
              onClick={() => { onChange(l); setOpen(false); }}
              style={{ display: 'block', width: '100%', padding: '13px 16px', background: value === l ? 'rgba(252,75,78,0.1)' : 'none', border: 'none', color: value === l ? '#FC4B4E' : '#F5F2EB', fontSize: '14px', textAlign: 'left', cursor: 'pointer', fontFamily: "'Grift', sans-serif" }}
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AddressesPage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [editAddr, setEditAddr] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const data = await api.get('/customers/addresses'); setAddresses(data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY); setEditAddr(null); setModal('add'); };
  const openEdit = (addr) => {
    setEditAddr(addr);
    setForm({
      label: addr.label, name: addr.name || '', phone: addr.phone || '', email: addr.email || '',
      houseNo: addr.houseNo || '', street: addr.street, landmark: addr.landmark || '',
      city: addr.city, state: addr.state, pincode: addr.pincode, isDefault: addr.isDefault
    });
    setModal('edit');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal === 'edit') await api.put(`/customers/addresses/${editAddr.id}`, form);
      else await api.post('/customers/addresses', form);
      setModal(null);
      load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/customers/addresses/${deleteId}`); setDeleteId(null); load(); }
    catch (e) { alert(e.message); }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => navigate('/account')} style={{ background: 'none', border: 'none', color: '#F5F2EB', cursor: 'pointer', display: 'flex', padding: '4px' }}>
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#F5F2EB' }}>Saved Addresses</h2>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FC4B4E', border: 'none', borderRadius: '8px', padding: '8px 14px', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Grift', sans-serif" }}>
            <Plus size={14} /> Add New
          </button>
        </div>

        {loading ? <p style={{ color: '#71717A', fontSize: '14px' }}>Loading...</p> :
         addresses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#71717A' }}>
            <MapPin size={32} strokeWidth={1} style={{ marginBottom: '12px', color: '#3F3F46' }} />
            <p style={{ fontSize: '14px' }}>No addresses saved yet.</p>
          </div>
        ) : addresses.map(addr => (
          <div key={addr.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${addr.isDefault ? 'rgba(252,75,78,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', color: '#A1A1AA', fontWeight: 500 }}>{addr.label}</span>
                {addr.isDefault && <span style={{ background: 'rgba(252,75,78,0.12)', color: '#FC4B4E', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', fontWeight: 600 }}>DEFAULT</span>}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => openEdit(addr)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '7px', padding: '6px', color: '#A1A1AA', cursor: 'pointer', display: 'flex' }}><Edit2 size={13} /></button>
                <button onClick={() => setDeleteId(addr.id)} style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: '7px', padding: '6px', color: '#EF4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={13} /></button>
              </div>
            </div>
            {addr.name && <p style={{ color: '#F5F2EB', fontSize: '13px', fontWeight: 600 }}>{addr.name}{addr.phone && ` · +91 ${addr.phone}`}</p>}
            <p style={{ color: '#F5F2EB', fontSize: '13px', lineHeight: '1.6', marginTop: '4px' }}>{addr.houseNo ? `${addr.houseNo}, ` : ''}{addr.street}</p>
            {addr.landmark && <p style={{ color: '#A1A1AA', fontSize: '12px' }}>Near {addr.landmark}</p>}
            <p style={{ color: '#A1A1AA', fontSize: '12px' }}>{addr.city}, {addr.state} — {addr.pincode}</p>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '512px', margin: '0 auto', background: '#1F2024', borderTop: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px 24px 0 0', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#F5F2EB', fontSize: '16px', fontWeight: 500 }}>{modal === 'edit' ? 'Edit Address' : 'New Address'}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', color: '#71717A', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '6px' }}>FULL NAME</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Recipient's name" required style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#71717A', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '6px' }}>PHONE NUMBER</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="98765 43210" required style={inp} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', color: '#71717A', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '6px' }}>EMAIL ADDRESS <span style={{ opacity: 0.6 }}>(optional)</span></label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#71717A', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '6px' }}>LABEL</label>
                <LabelPicker value={form.label} onChange={l => setForm(f => ({ ...f, label: l }))} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#71717A', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '6px' }}>HOUSE / FLAT NO.</label>
                <input value={form.houseNo} onChange={e => setForm(f => ({ ...f, houseNo: e.target.value }))} placeholder="e.g. B-204" required style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#71717A', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '6px' }}>STREET ADDRESS</label>
                <input value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} placeholder="Street, Area" required style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#71717A', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '6px' }}>LANDMARK <span style={{ opacity: 0.6 }}>(optional)</span></label>
                <input value={form.landmark} onChange={e => setForm(f => ({ ...f, landmark: e.target.value }))} placeholder="e.g. Near City Mall" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', color: '#71717A', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '6px' }}>CITY</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="New Delhi" required style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#71717A', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '6px' }}>STATE</label>
                  <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="Delhi" required style={inp} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', color: '#71717A', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '6px' }}>PINCODE</label>
                <input value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} placeholder="110001" required style={inp} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#A1A1AA', fontSize: '13px' }}>
                <div onClick={() => setForm(f => ({ ...f, isDefault: !f.isDefault }))}
                  style={{ width: '18px', height: '18px', borderRadius: '5px', border: `2px solid ${form.isDefault ? '#FC4B4E' : 'rgba(255,255,255,0.2)'}`, background: form.isDefault ? '#FC4B4E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                  {form.isDefault && <Check size={11} color="white" strokeWidth={3} />}
                </div>
                Set as default address
              </label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', padding: '13px', color: '#A1A1AA', fontSize: '14px', cursor: 'pointer', fontFamily: "'Grift', sans-serif" }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-buy-now" style={{ flex: 1, height: '46px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#1F2024', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '360px' }}>
            <h3 style={{ color: '#F5F2EB', fontSize: '16px', fontWeight: 500, marginBottom: '10px' }}>Delete Address</h3>
            <p style={{ color: '#71717A', fontSize: '13px', marginBottom: '20px' }}>This address will be permanently removed.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', padding: '12px', color: '#A1A1AA', fontSize: '14px', cursor: 'pointer', fontFamily: "'Grift', sans-serif" }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex: 1, background: '#EF4444', border: 'none', borderRadius: '10px', padding: '12px', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Grift', sans-serif" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
