import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Check, Plus } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function AddressPickerSheet({ isOpen, onClose, selectedId, onSelect }) {
  const { customer } = useAuth();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !customer) return;
    setLoading(true);
    api.get('/customers/addresses')
      .then(setAddresses)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleSelect = (addr) => {
    onSelect(addr);
    onClose();
  };

  const handleAddNew = () => {
    onClose();
    navigate('/account/addresses');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 70,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)',
          transition: 'opacity 0.25s',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          maxWidth: '512px', margin: '0 auto',
          zIndex: 71,
          background: '#1F2024',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '24px 24px 0 0',
          maxHeight: '75vh',
          display: 'flex', flexDirection: 'column',
          transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.25s',
          transform: isOpen ? 'translateY(0)' : 'translateY(110%)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          fontFamily: "'Grift', sans-serif",
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#F5F2EB' }}>Select Address</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', display: 'flex' }}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Address list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading ? (
            <p style={{ color: '#71717A', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>Loading addresses...</p>
          ) : addresses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#71717A' }}>
              <MapPin size={28} strokeWidth={1} style={{ marginBottom: '10px', color: '#3F3F46' }} />
              <p style={{ fontSize: '13px' }}>No saved addresses yet.</p>
            </div>
          ) : (
            addresses.map(addr => {
              const isSelected = selectedId === addr.id;
              return (
                <button
                  key={addr.id}
                  onClick={() => handleSelect(addr)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    width: '100%', textAlign: 'left', padding: '14px',
                    background: isSelected ? 'rgba(252,75,78,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${isSelected ? 'rgba(252,75,78,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '14px', marginBottom: '10px',
                    cursor: 'pointer', fontFamily: "'Grift', sans-serif",
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <MapPin size={16} strokeWidth={1.5} color={isSelected ? '#FC4B4E' : '#71717A'} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? '#FC4B4E' : '#A1A1AA', background: isSelected ? 'rgba(252,75,78,0.12)' : 'rgba(255,255,255,0.06)', borderRadius: '5px', padding: '2px 8px' }}>
                        {addr.label}
                      </span>
                      {addr.isDefault && (
                        <span style={{ fontSize: '10px', color: '#71717A' }}>Default</span>
                      )}
                    </div>
                    <p style={{ fontSize: '13px', color: '#F5F2EB', lineHeight: 1.5 }}>{addr.street}</p>
                    <p style={{ fontSize: '12px', color: '#71717A', marginTop: '2px' }}>{addr.city}, {addr.state} — {addr.pincode}</p>
                  </div>
                  {isSelected && (
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#FC4B4E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={12} color="white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Add new address */}
        <div style={{ padding: '12px 16px 32px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleAddNew}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '14px', color: '#A1A1AA', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: "'Grift', sans-serif' " }}
          >
            <Plus size={15} strokeWidth={2} /> Add New Address
          </button>
        </div>
      </div>
    </>
  );
}
