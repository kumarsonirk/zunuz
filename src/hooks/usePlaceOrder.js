import { useState } from 'react';
import { api } from '../utils/api';
import { openRazorpayCheckout } from '../utils/razorpay';

export default function usePlaceOrder(customer) {
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const placeOrder = async ({ addressId, items, paymentMethod }) => {
    setPlacing(true);
    setOrderError('');
    try {
      const res = await api.post('/orders', { addressId, items, paymentMethod });

      if (paymentMethod === 'COD') {
        setPlacedOrder(res);
        setShowSuccess(true);
        setPlacing(false);
        return res;
      }

      // RAZORPAY: res = { order, razorpayOrderId, keyId, amount }
      await openRazorpayCheckout({
        keyId: res.keyId,
        amount: res.amount,
        razorpayOrderId: res.razorpayOrderId,
        name: 'Zunuz',
        description: `Order #${res.order.id}`,
        prefill: {
          name: customer?.name || '',
          contact: customer?.phone || '',
          email: customer?.email || '',
        },
        onSuccess: async (response) => {
          try {
            const verified = await api.post(`/orders/${res.order.id}/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setPlacedOrder(verified);
            setShowSuccess(true);
          } catch (e) {
            setOrderError(e.message || 'Payment verification failed. Contact support if the amount was deducted.');
          } finally {
            setPlacing(false);
          }
        },
        onDismiss: () => {
          api.post(`/orders/${res.order.id}/cancel-payment`, {}).catch(() => {});
          setPlacing(false);
        },
      });
      return null;
    } catch (e) {
      setOrderError(e.message || 'Failed to place order. Try again.');
      setPlacing(false);
      return null;
    }
  };

  const reset = () => {
    setOrderError('');
    setPlacedOrder(null);
    setShowSuccess(false);
  };

  return { placing, orderError, setOrderError, placedOrder, showSuccess, setShowSuccess, placeOrder, reset };
}
