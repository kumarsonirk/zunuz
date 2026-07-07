import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfilePage() {
  const { customer, loading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: customer?.name || '', email: customer?.email || '', phone: customer?.phone || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Keep the edit form in sync once the /customers/me fetch resolves (it starts
  // null on a refresh, so the form's initial state above can be stale).
  useEffect(() => {
    if (customer) setForm({ name: customer.name || '', email: customer.email || '', phone: customer.phone || '' });
  }, [customer]);

  const inp = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px', color: '#F5F2EB', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: "'Grift', sans-serif" };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await updateProfile({ name: form.name, email: form.email, phone: form.phone });
      setEditing(false);
      setSuccess('Profile updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => navigate('/account')} style={{ background: 'none', border: 'none', color: '#F5F2EB', cursor: 'pointer', display: 'flex', padding: '4px' }}>
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#F5F2EB' }}>Edit Profile</h2>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px', padding: '12px 16px', color: '#22C55E', fontSize: '13px', textAlign: 'center' }}>{success}</div>}

        {/* Profile Info Card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#F5F2EB' }}>Personal Info</h3>
            <button onClick={() => setEditing(!editing)} style={{ background: 'none', border: 'none', color: '#FC4B4E', fontSize: '12px', cursor: 'pointer', fontFamily: "'Grift', sans-serif" }}>
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editing ? (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {error && <p style={{ color: '#FC4B4E', fontSize: '12px' }}>{error}</p>}
              <div>
                <label style={{ display: 'block', color: '#71717A', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '6px' }}>FULL NAME</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#71717A', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '6px' }}>EMAIL</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#71717A', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '6px' }}>PHONE</label>
                <input value={form.phone} disabled style={{ ...inp, opacity: 0.5, cursor: 'not-allowed' }} />
                <p style={{ color: '#52525B', fontSize: '11px', marginTop: '6px' }}>Phone number can't be changed — it's tied to your OTP login.</p>
              </div>
              <button type="submit" disabled={saving} className="btn-buy-now" style={{ height: '46px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Row label="Name" value={customer?.name} />
              <Row label="Email" value={customer?.email || '—'} />
              <Row label="Phone" value={customer?.phone || '—'} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: '#A1A1AA', fontSize: '13px' }}>{label}</span>
      <span style={{ color: '#F5F2EB', fontSize: '13px' }}>{value}</span>
    </div>
  );
}
