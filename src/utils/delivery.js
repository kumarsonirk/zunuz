// Mirrors server/src/lib/stock.js's identical constants — that copy is what
// actually determines the charged amount; this one is purely for display, so
// the checkout UI shows the same numbers the backend will actually charge.
export const DELIVERY_FEE = 70;
export const FREE_DELIVERY_THRESHOLD = 700; // itemsTotal >= this ⇒ free delivery

export function computeDeliveryFee(itemsTotal) {
  return itemsTotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

// Amount still needed to unlock free delivery, or null if already qualified.
export function amountToFreeDelivery(itemsTotal) {
  const remaining = FREE_DELIVERY_THRESHOLD - itemsTotal;
  return remaining > 0 ? remaining : null;
}
