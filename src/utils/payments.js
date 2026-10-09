import { SETTINGS } from '../store/settings';

// Which payment methods checkout offers — set on the admin Settings page
// (the server rejects a disabled method too). Shared by the storefront
// checkout, product page, FAQs and the older PaymentMethodPicker.
export const ONLINE_PAYMENTS_ENABLED = SETTINGS.onlinePaymentsEnabled;
export const COD_ENABLED = SETTINGS.codEnabled;

export const PAYMENT_OPTIONS = [
  { id: 'RAZORPAY', label: 'Pay online', sub: 'UPI, cards, netbanking, wallets', enabled: ONLINE_PAYMENTS_ENABLED },
  { id: 'COD', label: 'Cash on delivery', sub: 'Pay when it arrives', enabled: COD_ENABLED },
].filter((o) => o.enabled);

// How an order's payment method reads to customers. 'CREDITS' = the whole
// order was paid with ZUNUZ Credits (no Razorpay / COD step).
export const paymentMethodLabel = (method) => (
  method === 'CREDITS' ? 'Paid with ZUNUZ Credits'
    : method === 'RAZORPAY' ? 'Paid online (Razorpay)'
      : 'Cash on delivery'
);
