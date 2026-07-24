const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Railway (and most PaaS hosts) sit the app behind a reverse proxy, which sets
// X-Forwarded-For. Without telling Express to trust that proxy hop, both
// req.ip and express-rate-limit's IP-based key generator throw at request
// time (rate-limit does this deliberately, to stop X-Forwarded-For spoofing
// from bypassing limits) — silently breaking every rate-limited route (all
// of /api/auth/*, admin login) while unaffected routes work fine.
app.set('trust proxy', 1);

// CLIENT_URL supports a comma-separated list, so both the custom domain(s) and
// the raw *.vercel.app URL can hit the API at once — a single fixed origin
// meant only one of them ever worked, with the other silently CORS-blocked
// (which the frontend can't distinguish from "no data", so it just looked
// like stale/wrong data instead of an obvious error).
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Requests with no Origin header (curl, server-to-server, Postman) aren't
    // subject to CORS in the first place — only browsers send/enforce it.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Razorpay webhooks need the raw body for signature verification, so this must be
// mounted before the global express.json() parser below.
app.use('/api/webhooks', express.raw({ type: 'application/json' }), require('./routes/webhooks'));

app.use(express.json());

// Serve uploaded product images
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Customer routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/products',  require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/campaign',  require('./routes/campaign'));

// Admin routes
app.use('/api/admin/auth',       require('./routes/admin/auth'));
app.use('/api/admin/upload',     require('./routes/admin/upload'));
app.use('/api/admin/products',   require('./routes/admin/products'));
app.use('/api/admin/orders',     require('./routes/admin/orders'));
app.use('/api/admin/customers',  require('./routes/admin/customers'));
app.use('/api/admin/categories', require('./routes/admin/categories'));
app.use('/api/admin/campaign',   require('./routes/admin/campaign'));


// Development route to preview the premium email design directly in browser
app.get('/api/dev/preview-order-email', (req, res) => {
  const { getOrderConfirmationHtml } = require('./lib/email');
  
  // Simulated premium mockup order data
  const mockOrder = {
    id: 1237651365,
    total: 4500,
    createdAt: new Date(),
    paymentMethod: 'COD',
    address: {
      name: 'Pavithran',
      phone: '9876543210',
      houseNo: '4140',
      street: 'Parker Rd.',
      landmark: 'Near Central Park',
      city: 'Allentown',
      state: 'New Mexico',
      pincode: '31134'
    },
    items: [
      {
        quantity: 1,
        price: 3000,
        product: {
          name: 'Grey man T-shirt',
          image: '/uploads/placeholder.png'
        }
      },
      {
        quantity: 1,
        price: 1500,
        product: {
          name: 'Milton water bottle',
          image: '/uploads/placeholder.png'
        }
      }
    ]
  };

  const html = getOrderConfirmationHtml(mockOrder);
  res.send(html);
});

// Development route to preview the welcome email design directly in browser
app.get('/api/dev/preview-welcome-email', (req, res) => {
  const { getWelcomeEmailHtml } = require('./lib/email');
  const html = getWelcomeEmailHtml('Pavithran');
  res.send(html);
});

app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'Zunuz API' }));

app.listen(PORT, () => {
  console.log(`Zunuz API running on http://localhost:${PORT}`);
});
