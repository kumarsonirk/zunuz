// Shared fulfilment helpers (admin Orders + Returns pages).
export const COURIERS = ['Delhivery', 'Blue Dart', 'DTDC', 'India Post', 'Ekart', 'Xpressbees', 'Shiprocket', 'Other'];

const TRACK_URL = {
  Delhivery: (n) => `https://www.delhivery.com/track/package/${n}`,
  'Blue Dart': (n) => `https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo=${n}`,
  DTDC: (n) => `https://www.dtdc.in/trace.asp?strCnno=${n}`,
  'India Post': () => 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
  Ekart: (n) => `https://ekartlogistics.com/shipmenttrack/${n}`,
  Xpressbees: (n) => `https://www.xpressbees.com/shipment/tracking?awbNo=${n}`,
  Shiprocket: (n) => `https://shiprocket.co/tracking/${n}`,
};

// Best-guess public tracking page for a known courier ('' if unknown).
export function trackingUrlFor(courier, number) {
  const n = String(number || '').trim();
  const fn = TRACK_URL[courier];
  if (!fn || !n) return '';
  return fn(encodeURIComponent(n));
}

export const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

// Did this order take money (and can therefore be refunded)?
export const isOnlinePaid = (o) => o.paymentMethod === 'RAZORPAY' && o.paymentStatus === 'PAID';
export const tookMoney = (o) => isOnlinePaid(o) || (o.paymentMethod === 'COD' && (o.paymentStatus === 'PAID' || o.status === 'DELIVERED'));
export const refundableOf = (o) => Math.max(0, (o.total || 0) - (o.refundAmount || 0));

// Online order moved forward although the payment never arrived.
export const paymentMismatch = (o) => o.paymentMethod === 'RAZORPAY' && o.paymentStatus !== 'PAID' && ['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(o.status);

// Items / discount / delivery / credits split (orders only store the grand
// total): total = items − discount − creditsUsed + delivery.
export function breakdown(o) {
  const items = (o.items || []).reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = o.discount || 0;
  const credits = o.creditsUsed || 0;
  const delivery = Math.max(0, (o.total || 0) - items + discount + credits);
  return { items, discount, credits, delivery, total: o.total || 0 };
}

// Admin label for an order's payment method.
export const paymentMethodName = (m) => (m === 'CREDITS' ? 'ZUNUZ Credits' : m === 'COD' ? 'COD' : 'Razorpay');

export const REFUND_STATUS = {
  PROCESSED: { label: 'Refunded', tone: 'green' },
  PENDING: { label: 'Refund pending', tone: 'yellow' },
  FAILED: { label: 'Refund failed', tone: 'red' },
};

export const RETURN_STATUS = {
  PENDING: { label: 'Pending', tone: 'yellow' },
  APPROVED: { label: 'Approved', tone: 'blue' },
  REJECTED: { label: 'Rejected', tone: 'red' },
  COMPLETED: { label: 'Completed', tone: 'green' },
};
export const RETURN_TYPE = { REPLACEMENT: 'Replacement', REFUND: 'Refund' };
