// Renders a sample invoice PDF with fake data so you can check the design
// without a real order — no DB or login needed. Run from the project root:
//   node scripts/preview-invoice.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildInvoiceDoc } from '../src/utils/invoice.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mockOrder = {
  id: 11,
  createdAt: new Date().toISOString(),
  total: 799,
  paymentMethod: 'RAZORPAY',
  razorpayPaymentId: 'pay_TJcvP8suD3xOis',
  address: {
    name: 'Remya', phone: '9876543210',
    houseNo: '126', street: 'Ramanjaneye Layout', landmark: 'Behind temple',
    city: 'Bengaluru', state: 'Karnataka', pincode: '560037',
  },
  items: [
    { quantity: 1, price: 799, product: { name: 'Stellar' } },
  ],
};

const doc = buildInvoiceDoc(mockOrder);
const outPath = path.join(__dirname, 'invoice-preview.pdf');
fs.writeFileSync(outPath, Buffer.from(doc.output('arraybuffer')));
console.log(`Preview written to: ${outPath}\nOpen it directly (double-click, or drag into a browser tab) to view.`);
