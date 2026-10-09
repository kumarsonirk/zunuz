import React, { useState, useEffect } from 'react';
import { Star, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import ImageLightbox from './ImageLightbox';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB — matches the server-side multer limit in server/src/routes/reviews.js

function StarRating({ value, onChange, size = 16 }) {
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

// Product-level reviews — distinct from the delivered-order satisfaction
// rating (OrderHistoryPage.jsx / admin OrdersPage.jsx), which is unrelated
// and left untouched. Login required to write one; once submitted it can't
// be edited by the customer (enforced server-side too, not just hidden here).
export default function ProductReviews({ productId }) {
  const { customer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    if (!productId) { setLoading(false); return; }
    setLoading(true);
    api.get(`/products/${productId}/reviews`)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [productId]);

  const myReview = customer ? reviews.find(r => r.customerId === customer.id) : null;

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Image must be 2MB or smaller.');
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    setImageError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const submitReview = async () => {
    if (rating < 1) { setSubmitError('Please select a star rating.'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      const formData = new FormData();
      formData.append('rating', rating);
      if (comment.trim()) formData.append('comment', comment.trim());
      if (imageFile) formData.append('image', imageFile);

      // This one request bypasses src/utils/api.js's helper (which always
      // sends Content-Type: application/json) since a file upload needs
      // multipart/form-data instead.
      const token = localStorage.getItem('zunuz_customer_token');
      const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
      const res = await fetch(`${BASE}/products/${productId}/reviews`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit review.');

      setReviews(list => [data, ...list]);
      setRating(0);
      setComment('');
      setImageFile(null);
      setImagePreview(null);
    } catch (e) {
      setSubmitError(e.message || 'Could not submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  return (
    <div className="px-6 pt-5 pb-1">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#F5F2EB', fontFamily: "'Grift', sans-serif" }}>
          Reviews{reviews.length > 0 ? ` (${reviews.length})` : ''}
        </h3>
        {avgRating != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <StarRating value={Math.round(avgRating)} size={13} />
            <span style={{ color: '#F5F2EB', fontSize: '14px', fontWeight: 600 }}>{avgRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Write a review — hidden entirely once this customer already has one for
          this product (view it via Account > My Reviews instead), not repeated
          here on top of the same review already appearing in the list below. */}
      {!myReview && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px', marginBottom: '18px' }}>
          {!customer ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <p style={{ color: '#A1A1AA', fontSize: '14px', marginBottom: '12px' }}>Log in to write a review.</p>
              <button
                onClick={() => navigate('/login', { state: { returnTo: location.pathname } })}
                style={{ background: 'none', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '10px', padding: '8px 20px', color: '#D4AF37', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Grift', sans-serif" }}
              >
                Log In
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ color: '#71717A', fontSize: '12px', letterSpacing: '0.06em' }}>WRITE A REVIEW</p>
              <StarRating value={rating} onChange={setRating} size={24} />
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share your thoughts about this product (optional)"
                rows={3}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 12px', color: '#F5F2EB', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: "'Grift', sans-serif" }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#A1A1AA', fontSize: '12px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 12px' }}>
                  Add Photo (max 2MB)
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImagePick} style={{ display: 'none' }} />
                </label>
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px' }} />
                )}
              </div>
              {imageError && <p style={{ color: '#EF4444', fontSize: '12px', margin: 0 }}>{imageError}</p>}
              {submitError && <p style={{ color: '#EF4444', fontSize: '12px', margin: 0 }}>{submitError}</p>}
              <button
                onClick={submitReview}
                disabled={submitting}
                className="btn-buy-now"
                style={{ height: '42px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <p style={{ color: '#71717A', fontSize: '13px' }}>Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p style={{ color: '#71717A', fontSize: '13px' }}>No reviews yet. Be the first to review this product.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {reviews.map(r => (
            <div key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={13} color="#D4AF37" />
                  </div>
                  <span style={{ color: '#F5F2EB', fontSize: '13px', fontWeight: 500 }}>{r.customer?.name || 'Anonymous'}</span>
                </div>
                <span style={{ color: '#71717A', fontSize: '11px' }}>
                  {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <StarRating value={r.rating} size={13} />
              {r.comment && <p style={{ color: '#A1A1AA', fontSize: '14px', lineHeight: 1.6, marginTop: '6px' }}>{r.comment}</p>}
              {r.image && (
                <img
                  src={r.image}
                  alt="Review"
                  onClick={() => setLightboxImage(r.image)}
                  style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px', cursor: 'pointer' }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {lightboxImage && (
        <ImageLightbox images={[lightboxImage]} initialIndex={0} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
}
