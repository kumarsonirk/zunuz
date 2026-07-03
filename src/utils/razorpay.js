let loadPromise = null;

export function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => { loadPromise = null; reject(new Error('Failed to load Razorpay checkout script.')); };
    document.body.appendChild(script);
  });
  return loadPromise;
}

export async function openRazorpayCheckout({ keyId, amount, razorpayOrderId, name, description, prefill, onSuccess, onDismiss }) {
  await loadRazorpayScript();
  const rzp = new window.Razorpay({
    key: keyId,
    amount,
    currency: 'INR',
    order_id: razorpayOrderId,
    name: name || 'Zunuz',
    description: description || 'Order payment',
    prefill,
    theme: { color: '#FC4B4E' },
    handler: (response) => onSuccess(response),
    modal: { ondismiss: () => onDismiss?.() },
  });
  rzp.open();
}
