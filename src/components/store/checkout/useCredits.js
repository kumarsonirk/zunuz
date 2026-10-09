import { useEffect, useState } from 'react';
import { api } from '../../../utils/api';

// The signed-in customer's ZUNUZ Credits (GET /credits/me) for checkout.
// `balance` is 0 until loaded / on error, so the toggle simply stays hidden.
// (Credits stay spendable even if the referral program is switched off.)
export default function useCredits(customer) {
  const [data, setData] = useState(null); // { balance, pending, expiringSoon, history }
  const id = customer?.id;
  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    api.get('/credits/me')
      .then((r) => { if (alive) setData(r || null); })
      .catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, [id]);
  const balance = id && data ? Math.max(0, Math.floor(Number(data.balance) || 0)) : 0;
  return { balance, expiringSoon: data?.expiringSoon || null, loaded: !!data };
}
