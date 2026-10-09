import { COD_ENABLED } from '../utils/payments';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '../utils/delivery';
import { SETTINGS } from '../store/settings';

// Customer FAQs — used by the home page FAQ section and /customer-care/faq.
// Keep answers in line with the policy pages (shipping, returns,
// cancellation, product care) and the live checkout settings.
export const FAQS = [
  {
    q: 'How long does delivery take?',
    a: SETTINGS.pincodeRestriction
      ? 'Right now we deliver within Bengaluru only — orders are packed within 12 hours and usually arrive in 1–3 days. More cities are coming soon! You get tracking details as soon as it ships.'
      : 'Most orders are packed and dispatched within 12 hours of confirmation and reach you in 2–7 business days across India. You get tracking details by email/SMS as soon as it ships.',
  },
  ...(SETTINGS.pincodeRestriction ? [{ q: 'Do you deliver to my city?', a: 'For now we deliver within Bengaluru (pincodes 560001–560117). Enter your pincode on any product page to check. We’re adding more cities soon.' }] : []),
  {
    q: 'How can I pay?',
    a: COD_ENABLED
      ? 'Pay online with UPI, cards, net banking or wallets (secured by Razorpay), or choose cash on delivery at checkout.'
      : 'Pay online with UPI, cards, net banking or wallets — payments are secured by Razorpay. Cash on delivery is paused for now.',
  },
  { q: 'Is delivery free?', a: !SETTINGS.deliveryFeeEnabled ? 'Yes — delivery is free on every order right now.' : `Delivery is free on orders of ₹${FREE_DELIVERY_THRESHOLD} and above. Below that a flat ₹${DELIVERY_FEE} fee is added — you'll always see it at checkout before you pay.` },
  { q: 'What if my order arrives damaged or wrong?', a: "Contact us within 24 hours of delivery with your order ID, clear photos and an uninterrupted unboxing video — we'll send a replacement (or refund if we can't)." },
  { q: 'How do I care for my jewellery?', a: 'Keep it dry, put it on after perfume and lotion, and store pieces separately in a pouch. Wipe with a soft cloth after each wear to keep the shine.' },
  { q: 'Can I cancel my order?', a: 'Yes — within 6 hours of placing it, as long as it hasn’t shipped. Open My account → Orders, pick the order and tap “Cancel order”. Prepaid orders are refunded automatically and reach you in 5–7 business days.' },
  { q: 'How do I track my order?', a: 'Use the tracking details sent when your order ships, or see its status any time under My account → Orders.' },
  { q: 'Do I need an account to order?', a: 'Yes — a free account lets us save your address, send order updates and keep your order history in one place. It takes under a minute.' },
];
