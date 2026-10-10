// Coupon helpers for the admin UI — mirror server/src/lib/coupons.js.
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

export function describeRule(c) {
  const parts = [c.type === 'PERCENT' ? `${c.value}% off` : `${inr(c.value)} off`];
  if (c.type === 'PERCENT' && c.maxDiscount != null) parts.push(`max ${inr(c.maxDiscount)}`);
  if (c.minOrder > 0) parts.push(`min ${inr(c.minOrder)}`);
  if (c.firstOrderOnly) parts.push('first order only');
  return parts.join(' · ');
}

export function discountFor(c, itemsTotal) {
  if (c.type === 'PERCENT') {
    let d = Math.floor((itemsTotal * c.value) / 100);
    if (c.maxDiscount != null) d = Math.min(d, c.maxDiscount);
    return Math.min(d, itemsTotal);
  }
  return Math.min(c.value, itemsTotal);
}

// <input type="date"> ⇄ ISO. Start = beginning of the day, end = end of the
// day, in the admin's local time (IST).
const pad = (n) => String(n).padStart(2, '0');
export function toDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fromDateInput(value, endOfDay = false) {
  if (!value) return null;
  return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`).toISOString();
}

export const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const COUPON_STATUS = {
  ACTIVE: { label: 'Active', tone: 'green' },
  SCHEDULED: { label: 'Scheduled', tone: 'blue' },
  EXPIRED: { label: 'Expired', tone: 'muted' },
  USED_UP: { label: 'Used up', tone: 'yellow' },
  OFF: { label: 'Off', tone: 'red' },
};
