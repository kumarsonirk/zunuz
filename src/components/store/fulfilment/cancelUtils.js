import { useEffect, useState } from 'react';
import { SETTINGS } from '../../../store/settings';

// Shared by OrderCancel.jsx and the My orders list.
export const CANCELLABLE = ['PENDING', 'CONFIRMED'];

// When the customer can no longer cancel (null if they can't at all).
export function cancelDeadline(order) {
  const hours = Number(SETTINGS.cancelWindowHours) || 0;
  if (!hours || !CANCELLABLE.includes(order.status)) return null;
  return new Date(new Date(order.createdAt).getTime() + hours * 3600e3);
}

// Current time, refreshed every 30 s (so the button disappears on time).
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}
