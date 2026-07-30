// Renders an order-confirmation email with fake data to a local HTML file so
// you can open it in a browser and check the design — no DB, SMTP/Resend, or
// real order needed. Run: node scripts/preview-email.js
const fs = require('fs');
const path = require('path');
const { getOrderConfirmationHtml } = require('../src/lib/email');

const mockOrder = {
  id: 9,
  createdAt: new Date().toISOString(),
  total: 769,
  paymentMethod: 'RAZORPAY',
  razorpayPaymentId: 'pay_QexampleFake12345',
  customer: { name: 'Rahul Kumar', email: 'test@example.com' },
  address: {
    name: 'Rahul Kumar',
    houseNo: '126',
    street: 'Ramanjaneye Layout',
    landmark: 'Behind temple',
    city: 'Marathahalli, Bengaluru',
    state: 'Karnataka',
    pincode: '560037',
  },
  items: [
    {
      quantity: 1,
      price: 699,
      product: { name: 'Luna Circle', image: '/gold_knot_necklace.png' },
    },
  ],
};

const html = getOrderConfirmationHtml(mockOrder);
const outPath = path.join(__dirname, 'email-preview.html');
fs.writeFileSync(outPath, html);
console.log(`Preview written to: ${outPath}\nOpen it directly in your browser to view.`);
