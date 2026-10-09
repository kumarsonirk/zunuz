const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
// Refuse to start the live server with missing / unsafe settings (lib/envCheck.js).
require('./lib/envCheck').checkEnv();

const { patchAsyncHandlers, installProcessGuards, errorHandler } = require('./lib/safety');
// Must run before any routes are registered (see lib/safety.js).
patchAsyncHandlers();
installProcessGuards();

const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Railway (and most PaaS hosts) sit the app behind a reverse proxy, which sets
// X-Forwarded-For. Without telling Express to trust that proxy hop, both
// req.ip and express-rate-limit's IP-based key generator throw at request
// time (rate-limit does this deliberately, to stop X-Forwarded-For spoofing
// from bypassing limits) — silently breaking every rate-limited route (all
// of /api/auth/*, admin login) while unaffected routes work fine.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Security headers for every API response. The API only serves JSON and
// uploaded images, so it never needs to be framed or sniffed. Uploads are
// loaded cross-origin by the storefront (Vercel), hence the CORP value.
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; frame-ancestors 'none'",
  });
  if (IS_PROD) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

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
    // Local development: accept the dev server on any localhost port (Vite
    // moves to 5174, 5175… when 5173 is taken by another project).
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
    const err = new Error('Not allowed by CORS');
    err.status = 403;
    callback(err);
  },
  credentials: true
}));

// gzip JSON/text responses (the product list shrinks several-fold). Images
// are already compressed, so compression skips them by content type.
app.use(compression());

// Razorpay webhooks need the raw body for signature verification, so this must be
// mounted before the global express.json() parser below.
app.use('/api/webhooks', express.raw({ type: 'application/json' }), require('./routes/webhooks'));

app.use(express.json({ limit: '2mb' })); // bulk product import sends batches of rows

// Serve uploaded product images
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
// Upload filenames are unique (timestamp + random) and never change, so
// browsers/CDNs can cache them for a year.
app.use('/uploads', express.static(uploadsDir, { maxAge: '365d', immutable: true }));

// Sitemap is proxied at the root path (not /api) since it must be reachable
// at https://www.zunuz.in/sitemap.xml — see vercel.json's rewrite for that path.
app.use('/', require('./routes/sitemap'));

// Maintenance mode (admin → Settings) is enforced here too, not just by the
// storefront swapping pages: while it's on, shoppers can't place orders,
// sign up or change anything through the API. Reads, the admin panel and
// payment webhooks (money already taken) keep working.
const MAINTENANCE_BLOCKED = /^\/api\/(orders|auth|customers|returns|coupons|campaign|newsletter\/subscribe|products\/[^/]+\/reviews)(\/|$)/;
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  if (!MAINTENANCE_BLOCKED.test(req.path)) return next();
  if (!require('./lib/settings').get().maintenanceMode) return next();
  res.status(503).json({ error: 'ZUNUZ is down for a quick update — please try again shortly.', maintenance: true });
});

// Customer routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/products',  require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/campaign',  require('./routes/campaign'));
app.use('/api/track',     require('./routes/track'));
app.use('/api/returns',   require('./routes/returns'));
app.use('/api/coupons',   require('./routes/coupons'));
app.use('/api/pincodes',  require('./routes/pincodes'));
app.use('/api/content',   require('./routes/content'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/credits',   require('./routes/credits'));
app.get('/api/settings', (req, res) => { res.set('Cache-Control', 'no-store'); res.json(require('./lib/settings').publicSettings()); });
app.use('/api/products/:productId/reviews', require('./routes/reviews'));

// Admin routes
const adminAuth = require('./middleware/adminAuth');
const { requirePermission: can, activityLogger: logs } = require('./lib/adminPermissions');
// Every admin section: signed-in admin → role permission → activity log.
const section = (key, opts) => [adminAuth, can(key, opts), logs(key)];
app.use('/api/admin/auth',       require('./routes/admin/auth'));
app.use('/api/admin/upload',     require('./routes/admin/upload'));
app.use('/api/admin/products',   ...section('products'),   require('./routes/admin/products'));
app.use('/api/admin/orders',     ...section('orders'),     require('./routes/admin/orders'));
app.use('/api/admin/customers',  ...section('customers'),  require('./routes/admin/customers'));
app.use('/api/admin/customers',  adminAuth, can('customers'), logs('credits'), require('./routes/admin/credits'));
app.use('/api/admin/referrals',  adminAuth, can('customers'), logs('referrals'), require('./routes/admin/referrals'));
app.use('/api/admin/categories', ...section('categories', { readWith: ['products'] }), require('./routes/admin/categories'));
app.use('/api/admin/campaign',   ...section('campaign'),   require('./routes/admin/campaign'));
app.use('/api/admin/reviews',    ...section('reviews'),    require('./routes/admin/reviews'));
app.use('/api/admin/stats',      adminAuth,                require('./routes/admin/stats'));
app.use('/api/admin/team',       ...section('team'),       require('./routes/admin/team'));
app.use('/api/admin/activity',   ...section('activity'),   require('./routes/admin/activity'));
app.use('/api/admin/settings',   ...section('settings'),   require('./routes/admin/settings'));
app.use('/api/admin/returns',    ...section('returns'),    require('./routes/admin/returns'));
app.use('/api/admin/coupons',    ...section('coupons'),    require('./routes/admin/coupons'));
app.use('/api/admin/pincodes',   ...section('settings'),   require('./routes/admin/pincodes'));
app.use('/api/admin/reports',    ...section('reports'),    require('./routes/admin/reports'));
app.use('/api/admin/abandoned',  adminAuth, can('orders'), logs('abandoned'), require('./routes/admin/abandoned'));
app.use('/api/admin/notes',      adminAuth, can('customers'), logs('notes'),  require('./routes/admin/notes'));
app.use('/api/admin/content',    ...section('content'),    require('./routes/admin/content'));
app.use('/api/admin/notifications', adminAuth,             require('./routes/admin/notifications'));
app.use('/api/admin/subscribers', adminAuth, can('campaign'), logs('subscribers'), require('./routes/admin/subscribers'));


// Development-only email previews (never on the live API).
if (!IS_PROD) {
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
}

app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'Zunuz API' }));

// Unknown API paths → JSON 404; then the final error handler (no stack traces).
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

require('./lib/alerts').startAlertScheduler();
require('./lib/cleanup').startCleanupScheduler();
require('./lib/holds').startHoldSweeper();
require('./lib/referrals').startReferralScheduler();

app.listen(PORT, () => {
  console.log(`Zunuz API running on http://localhost:${PORT}`);
});
