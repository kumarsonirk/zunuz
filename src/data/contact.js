import { SETTINGS } from '../store/settings';

// Support contact details — Help centre, policy pages, footer CTA. Set on
// the admin Settings page (loaded before the app starts, see main.jsx).
export const CONTACT = {
  email: SETTINGS.supportEmail,
  phone: SETTINGS.supportPhone,
  whatsapp: SETTINGS.supportWhatsapp,
  hours: SETTINGS.supportHours,
};

// Customer-care pages, in menu order.
export const HELP_PAGES = [
  { path: '/customer-care/faq', label: 'FAQs' },
  { path: '/customer-care/shipping-policy', label: 'Shipping' },
  { path: '/customer-care/returns-replacements', label: 'Returns & replacements' },
  { path: '/customer-care/cancellation-policy', label: 'Cancellation' },
  { path: '/customer-care/product-care', label: 'Product care' },
  { path: '/terms', label: 'Terms' },
  { path: '/privacy', label: 'Privacy' },
];
