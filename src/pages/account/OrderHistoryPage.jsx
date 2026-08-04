import React, { useEffect, useState } from 'react';
import { X, Package, Download, Star } from 'lucide-react';
import { api } from '../../utils/api';
import Price from '../../components/Price';
import { downloadInvoice } from '../../utils/invoice';
import Seo from '../../components/Seo';

function StarRating({ value, onChange, size = 20 }) {
  const interactive = !!onChange;
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={interactive ? () => onChange(n) : undefined}
          disabled={!interactive}
          style={{ background: 'none', border: 'none', padding: 0, cursor: interactive ? 'pointer' : 'default', display: 'flex' }}
        >
          <Star size={size} strokeWidth={1.5} color={n <= value ? '#D4AF37' : '#52525B'} fill={n <= value ? '#D4AF37' : 'none'} />
        </button>
      ))}
    </div>
  );
}

const STATUS_STYLE = {
  PENDING:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  label: 'Pending Approval' },
  CONFIRMED: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  label: 'Confirmed' },
  SHIPPED:   { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', label: 'Shipped'   },
  DELIVERED: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   label: 'Delivered' },
  CANCELLED: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   label: 'Cancelled' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.PENDING;
  return <span style={{ background: s.bg, color: s.color, borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}>{s.label}</span>;
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    api.get('/orders').then(setOrders).catch(console.error).finally(() => setLoading(false));
  }, []);

  const openDetail = (order) => {
    setDetail(order);
    setReviewRating(0);
    setReviewComment('');
    setReviewError('');
  };

  const submitReview = async () => {
    if (reviewRating < 1) { setReviewError('Please select a star rating.'); return; }
    setSubmittingReview(true);
    setReviewError('');
    try {
      const review = await api.post(`/orders/${detail.id}/review`, { rating: reviewRating, comment: reviewComment });
      setDetail(d => ({ ...d, review }));
      setOrders(list => list.map(o => o.id === detail.id ? { ...o, review } : o));
    } catch (e) {
      setReviewError(e.message || 'Could not submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
      <Seo title="Order History" path="/account/orders" noindex />
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#F5F2EB' }}>My Orders</h2>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {loading ? (
          <p style={{ color: '#71717A', fontSize: '14px' }}>Loading...</p>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#71717A' }}>
            <Package size={36} strokeWidth={1} style={{ marginBottom: '12px', color: '#3F3F46' }} />
            <p style={{ fontSize: '14px' }}>No orders placed yet.</p>
          </div>
        ) : orders.map(order => (
          <div key={order.id}
            onClick={() => openDetail(order)}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px', cursor: 'pointer' }}
            onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <p style={{ color: '#F5F2EB', fontSize: '17px', fontWeight: 500 }}>Order #{order.id}</p>
                <p style={{ color: '#A1A1AA', fontSize: '14px', marginTop: '2px' }}>
                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            {/* Items preview */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {order.items?.slice(0, 3).map(item => (
                <div key={item.id} style={{ width: '44px', height: '44px', background: '#fff', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={item.product?.image} alt={item.product?.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              ))}
              {(order.items?.length || 0) > 3 && (
                <div style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717A', fontSize: '11px', fontWeight: 600 }}>
                  +{order.items.length - 3}
                </div>
              )}
            </div>

            {order.status === 'DELIVERED' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                {order.review ? (
                  <StarRating value={order.review.rating} size={14} />
                ) : (
                  <span style={{ color: '#D4AF37', fontSize: '12px', fontWeight: 600 }}>Tap to rate this order</span>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: '#A1A1AA', fontSize: '14px' }}>{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button
                  onClick={e => { e.stopPropagation(); downloadInvoice(order); }}
                  title="Download Invoice"
                  style={{ background: 'none', border: 'none', color: '#A1A1AA', cursor: 'pointer', display: 'flex', padding: 0 }}
                >
                  <Download size={16} strokeWidth={1.5} />
                </button>
                <span style={{ color: '#F5F2EB', fontSize: '16px', fontWeight: 600 }}><Price value={`₹${order.total?.toLocaleString()}`} /></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Detail Modal */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '512px', margin: '0 auto', background: '#1F2024', borderTop: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px 24px 0 0', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ color: '#F5F2EB', fontSize: '19px', fontWeight: 500 }}>Order #{detail.id}</h3>
                <p style={{ color: '#A1A1AA', fontSize: '14px', marginTop: '3px' }}>
                  {new Date(detail.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <StatusBadge status={detail.status} />
                <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer' }}><X size={18} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Items */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px' }}>
                <p style={{ color: '#71717A', fontSize: '13px', letterSpacing: '0.06em', marginBottom: '12px' }}>ITEMS</p>
                {detail.items?.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#fff', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={item.product?.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: '#F5F2EB', fontSize: '15px' }}>{item.product?.name}</p>
                      <p style={{ color: '#71717A', fontSize: '13px' }}>Qty: {item.quantity} × <Price value={`₹${item.price}`} /></p>
                    </div>
                    <p style={{ color: '#F5F2EB', fontSize: '15px', fontWeight: 600 }}><Price value={`₹${item.quantity * item.price}`} /></p>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '12px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#A1A1AA', fontSize: '16px' }}>Total</span>
                  <span style={{ color: '#F5F2EB', fontWeight: 700, fontSize: '17px' }}><Price value={`₹${detail.total?.toLocaleString()}`} /></span>
                </div>
              </div>

              {/* Delivery */}
              {detail.address && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px' }}>
                  <p style={{ color: '#71717A', fontSize: '13px', letterSpacing: '0.06em', marginBottom: '8px' }}>DELIVERY ADDRESS</p>
                  {detail.address.name && (
                    <p style={{ color: '#F5F2EB', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                      {detail.address.name}{detail.address.phone && ` · +91 ${detail.address.phone}`}
                    </p>
                  )}
                  <p style={{ color: '#F5F2EB', fontSize: '15px', lineHeight: '1.6' }}>
                    {detail.address.houseNo ? `${detail.address.houseNo}, ` : ''}{detail.address.street}<br />
                    {detail.address.landmark ? `Near ${detail.address.landmark}, ` : ''}{detail.address.city}, {detail.address.state} — {detail.address.pincode}
                  </p>
                </div>
              )}

              {/* Review & Feedback (delivered orders only) */}
              {detail.status === 'DELIVERED' && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px' }}>
                  <p style={{ color: '#71717A', fontSize: '13px', letterSpacing: '0.06em', marginBottom: '10px' }}>
                    {detail.review ? 'YOUR REVIEW' : 'RATE & REVIEW THIS ORDER'}
                  </p>
                  {detail.review ? (
                    <>
                      <StarRating value={detail.review.rating} size={18} />
                      {detail.review.comment && (
                        <p style={{ color: '#F5F2EB', fontSize: '14px', lineHeight: '1.6', marginTop: '10px' }}>{detail.review.comment}</p>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <StarRating value={reviewRating} onChange={setReviewRating} size={26} />
                      <textarea
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        placeholder="Share your experience with this order (optional)"
                        rows={3}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 12px', color: '#F5F2EB', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: "'Grift', sans-serif" }}
                      />
                      {reviewError && <p style={{ color: '#EF4444', fontSize: '12px' }}>{reviewError}</p>}
                      <button
                        onClick={submitReview}
                        disabled={submittingReview}
                        className="btn-buy-now"
                        style={{ height: '42px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: submittingReview ? 'not-allowed' : 'pointer', opacity: submittingReview ? 0.7 : 1 }}
                      >
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => downloadInvoice(detail)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', height: '46px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#F5F2EB', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: "'Grift', sans-serif" }}
              >
                <Download size={16} strokeWidth={1.5} /> Download Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
