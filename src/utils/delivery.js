import { SETTINGS } from '../store/settings';

// Delivery charge, from the admin Settings page. The server
// (server/src/lib/stock.js) computes the amount actually charged; this copy
// is for display and is loaded before the app starts (see main.jsx).
export const DELIVERY_FEE = SETTINGS.deliveryFee;
export const FREE_DELIVERY_THRESHOLD = SETTINGS.freeDeliveryThreshold; // itemsTotal >= this ⇒ free delivery

export function computeDeliveryFee(itemsTotal) {
  if (!SETTINGS.deliveryFeeEnabled) return 0;
  return itemsTotal >= SETTINGS.freeDeliveryThreshold ? 0 : SETTINGS.deliveryFee;
}

// Amount still needed to unlock free delivery, or null if already qualified
// (or there's no delivery charge at all).
export function amountToFreeDelivery(itemsTotal) {
  if (!SETTINGS.deliveryFeeEnabled) return null;
  const remaining = SETTINGS.freeDeliveryThreshold - itemsTotal;
  return remaining > 0 ? remaining : null;
}
