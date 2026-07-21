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

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));

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


app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'Zunuz API' }));

app.listen(PORT, () => {
  console.log(`Zunuz API running on http://localhost:${PORT}`);
});
