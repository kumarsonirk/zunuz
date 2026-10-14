import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';

// Storefront pages (synchronous for a fast first paint). Each owns its own
// scroll container, header and footer — no MainLayout.
import HomePage from './pages/store/HomePage';
import JewelleryPage from './pages/store/JewelleryPage';
import CategoryPage from './pages/store/CategoryPage';
import StoreProductPage from './pages/store/ProductPage';
import StoreCartPage from './pages/store/CartPage';
import NavratriOffersPage from './pages/store/NavratriOffersPage';
import FestiveGlowPage from './pages/store/FestiveGlowPage';
import CheckoutPage from './pages/store/CheckoutPage';
import OrderSuccessPage from './pages/store/OrderSuccessPage';
import MaintenancePage from './pages/MaintenancePage';
import ReferralCapture from './components/store/ReferralCapture';
import { trackPageView } from './utils/track';
import { SETTINGS } from './store/settings';

// Lazy-loaded pages for code splitting (admin, auth, account, customer care, legal).
// The old MainLayout / useAppState storefront is no longer routed (files kept).
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const CustomerCarePage = lazy(() => import('./pages/CustomerCarePage'));
const ShippingPolicyPage = lazy(() => import('./pages/customer-care/ShippingPolicyPage'));
const ReturnsReplacementsPage = lazy(() => import('./pages/customer-care/ReturnsReplacementsPage'));
const CancellationPolicyPage = lazy(() => import('./pages/customer-care/CancellationPolicyPage'));
const ProductCarePage = lazy(() => import('./pages/customer-care/ProductCarePage'));
const FaqPage = lazy(() => import('./pages/customer-care/FaqPage'));
const HelpCenterPage = lazy(() => import('./pages/account/HelpCenterPage'));

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const UnsubscribePage = lazy(() => import('./pages/store/UnsubscribePage'));
const NotFoundPage = lazy(() => import('./pages/store/NotFoundPage'));


const AccountPage = lazy(() => import('./pages/account/AccountPage'));
const ProfilePage = lazy(() => import('./pages/account/ProfilePage'));
const AddressesPage = lazy(() => import('./pages/account/AddressesPage'));
const OrderHistoryPage = lazy(() => import('./pages/account/OrderHistoryPage'));
const MyReviewsPage = lazy(() => import('./pages/account/MyReviewsPage'));
const ReferPage = lazy(() => import('./pages/account/ReferPage'));

const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/admin/ProductsPage'));
const OrdersPage = lazy(() => import('./pages/admin/OrdersPage'));
const CustomersPage = lazy(() => import('./pages/admin/CustomersPage'));
const CustomerDetailPage = lazy(() => import('./pages/admin/CustomerDetailPage'));
const CategoriesPage = lazy(() => import('./pages/admin/CategoriesPage'));
const CampaignPage = lazy(() => import('./pages/admin/CampaignPage'));
const SubscribersPage = lazy(() => import('./pages/admin/SubscribersPage'));
const ReviewsPage = lazy(() => import('./pages/admin/ReviewsPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/UsersPage'));
const AdminRolesPage = lazy(() => import('./pages/admin/RolesPage'));
const AdminActivityPage = lazy(() => import('./pages/admin/ActivityPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const AdminReturnsPage = lazy(() => import('./pages/admin/ReturnsPage'));
const AdminCouponsPage = lazy(() => import('./pages/admin/CouponsPage'));
const AdminPincodesPage = lazy(() => import('./pages/admin/PincodesPage'));
const AdminReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const AdminAbandonedPage = lazy(() => import('./pages/admin/AbandonedPage'));
const AdminContentPage = lazy(() => import('./pages/admin/ContentPage'));
const AdminReferralsPage = lazy(() => import('./pages/admin/ReferralsPage'));

// Maintenance mode (admin Settings page): while on, every customer-facing
// route shows the maintenance page — the admin panel stays reachable so the
// store can still be managed. Read once at startup (see main.jsx).
const MAINTENANCE_MODE = SETTINGS.maintenanceMode; // admin Settings page

function AdminGuard({ children }) {
  const token = localStorage.getItem('zunuz_admin_token');
  return token ? children : <Navigate to="/admin/login" replace />;
}

// Every customer page is cream; index.html paints the page cream from the
// first frame (#t3-boot-bg) except on /admin. Drop it if the visitor moves
// into the (dark) admin panel.
function BootBgCleanup() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith('/admin')) document.getElementById('t3-boot-bg')?.remove();
  }, [pathname]);
  return null;
}

// Counts storefront page loads for the admin Statistics page (utils/track.js).
function PageTracker() {
  const { pathname } = useLocation();
  useEffect(() => { trackPageView(pathname); }, [pathname]);
  return null;
}

// Route adapters: read the URL here and hand the memo'd pages plain
// primitive props, so the pages don't subscribe to router context (which
// would re-render them — and stutter their scroll animations — whenever the
// app shell re-renders).
function CategoryRoute({ slug }) {
  const [params] = useSearchParams();
  return <CategoryPage categorySlug={slug} tier={params.get('tier')} />;
}
function ProductRoute() {
  const { slug } = useParams();
  return <StoreProductPage key={slug} slug={slug} />;
}

function OrderSuccessRoute() {
  const { id } = useParams();
  const { state } = useLocation();
  return <OrderSuccessPage key={id} orderId={id} initialOrder={state?.order || null} />;
}

// Shown while a lazy page chunk loads: the cream page + a small spinner.
function LoadingFallback() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[#FFF8EE]">
      <span aria-label="Loading" className="size-9 animate-spin rounded-full border-[3px] border-[#111110]/10 border-t-[#FF3D8B]" />
    </div>
  );
}

// Customer pages show the maintenance page while MAINTENANCE_MODE is on.
const store = (el) => (MAINTENANCE_MODE ? <MaintenancePage /> : el);

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BootBgCleanup />
      <PageTracker />
      {/* Saves a friend's ?ref=CODE (Refer & Earn) + the "sign up to claim" toast. */}
      <ReferralCapture />
      <Routes>
        {/* ── Storefront ── */}
        <Route path="/" element={store(<HomePage />)} />
        <Route path="/jewellery" element={store(<JewelleryPage />)} />
        <Route path="/shop" element={store(<CategoryRoute slug={null} />)} />
        <Route path="/necklaces" element={store(<CategoryRoute slug="necklaces" />)} />
        <Route path="/bracelets" element={store(<CategoryRoute slug="bracelets" />)} />
        <Route path="/earrings" element={store(<CategoryRoute slug="earrings" />)} />
        <Route path="/products/:slug" element={store(<ProductRoute />)} />
        <Route path="/navratri-offers" element={store(<NavratriOffersPage />)} />
        <Route path="/navratri-offer" element={<Navigate to="/navratri-offers" replace />} />
        <Route path="/festive-glow" element={store(<FestiveGlowPage />)} />
        <Route path="/cart" element={store(<StoreCartPage />)} />
        <Route path="/checkout" element={store(<CheckoutPage />)} />
        <Route path="/order/:id/success" element={store(<OrderSuccessRoute />)} />
        <Route path="/login" element={store(<LoginPage />)} />
        <Route path="/signup" element={store(<SignupPage />)} />
        <Route path="/forgot-password" element={store(<ForgotPasswordPage />)} />
        <Route path="/reset-password" element={store(<ResetPasswordPage />)} />
        <Route path="/verify-email" element={store(<VerifyEmailPage />)} />
        <Route path="/unsubscribe" element={store(<UnsubscribePage />)} />

        {/* ── Old URLs → new pages (the old page files are kept, unrouted) ── */}
        <Route path="/test" element={<Navigate to="/" replace />} />
        <Route path="/test2" element={<Navigate to="/" replace />} />
        <Route path="/test3" element={<Navigate to="/" replace />} />
        <Route path="/jewel" element={<Navigate to="/jewellery" replace />} />
        <Route path="/jewel/product" element={<Navigate to="/jewellery" replace />} />
        <Route path="/products" element={<Navigate to="/jewellery" replace />} />
        <Route path="/lite_products" element={<Navigate to="/jewellery" replace />} />
        <Route path="/neckwear" element={<Navigate to="/necklaces" replace />} />
        <Route path="/wristwear" element={<Navigate to="/bracelets" replace />} />
        <Route path="/earwear" element={<Navigate to="/earrings" replace />} />

        {/* ── Admin (no MainLayout, own sidebar) ── */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="campaign" element={<CampaignPage />} />
          <Route path="subscribers" element={<SubscribersPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="roles" element={<AdminRolesPage />} />
          <Route path="activity" element={<AdminActivityPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="returns" element={<AdminReturnsPage />} />
          <Route path="coupons" element={<AdminCouponsPage />} />
          <Route path="pincodes" element={<AdminPincodesPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="abandoned" element={<AdminAbandonedPage />} />
          <Route path="content" element={<AdminContentPage />} />
          <Route path="referrals" element={<AdminReferralsPage />} />
        </Route>


        {/* ── Customer care + legal ── */}
        <Route path="/customer-care" element={store(<CustomerCarePage />)} />
        <Route path="/customer-care/faq" element={store(<FaqPage />)} />
        <Route path="/customer-care/shipping-policy" element={store(<ShippingPolicyPage />)} />
        <Route path="/customer-care/returns-replacements" element={store(<ReturnsReplacementsPage />)} />
        <Route path="/customer-care/cancellation-policy" element={store(<CancellationPolicyPage />)} />
        <Route path="/customer-care/product-care" element={store(<ProductCarePage />)} />
        <Route path="/terms" element={store(<TermsPage />)} />
        <Route path="/privacy" element={store(<PrivacyPage />)} />

        {/* ── Account (pages guard themselves → /login) ── */}
        <Route path="/account" element={store(<AccountPage />)} />
        <Route path="/account/orders" element={store(<OrderHistoryPage />)} />
        <Route path="/account/addresses" element={store(<AddressesPage />)} />
        <Route path="/account/reviews" element={store(<MyReviewsPage />)} />
        <Route path="/account/profile" element={store(<ProfilePage />)} />
        <Route path="/account/refer" element={store(<ReferPage />)} />
        <Route path="/account/help-center" element={store(<HelpCenterPage />)} />

        <Route path="*" element={store(<NotFoundPage />)} />
      </Routes>
    </Suspense>
  );
}
