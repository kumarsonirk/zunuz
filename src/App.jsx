import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Main store layout + primary store pages (synchronous for ultra-fast landing)
import MainLayout from './components/MainLayout';
import CategorySelection from './pages/CategorySelection';
import ProductPage from './pages/ProductPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import CartPage from './pages/CartPage';
import { useAppState } from './hooks/useAppState';

// Lazy-loaded pages for code splitting (admin, auth, account, customer care, legal)
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

const AccountPage = lazy(() => import('./pages/account/AccountPage'));
const ProfilePage = lazy(() => import('./pages/account/ProfilePage'));
const AddressesPage = lazy(() => import('./pages/account/AddressesPage'));
const OrderHistoryPage = lazy(() => import('./pages/account/OrderHistoryPage'));

const ShineWithUsPage = lazy(() => import('./pages/ShineWithUsPage'));

const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/admin/ProductsPage'));
const OrdersPage = lazy(() => import('./pages/admin/OrdersPage'));
const CustomersPage = lazy(() => import('./pages/admin/CustomersPage'));
const CustomerDetailPage = lazy(() => import('./pages/admin/CustomerDetailPage'));
const CategoriesPage = lazy(() => import('./pages/admin/CategoriesPage'));
const CampaignPage = lazy(() => import('./pages/admin/CampaignPage'));

function AdminGuard({ children }) {
  const token = localStorage.getItem('zunuz_admin_token');
  return token ? children : <Navigate to="/admin/login" replace />;
}

function LoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '40vh',
      width: '100%',
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: '0.9rem',
      letterSpacing: '0.05em'
    }}>
      Loading...
    </div>
  );
}

export default function App() {
  const state = useAppState();

  const activeCategory = state.selectedCategory || (state.categories && state.categories[0]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* ── Standalone Campaign Page ── */}
        <Route path="/shine-with-us" element={<ShineWithUsPage />} />

        {/* ── Admin (no MainLayout, own sidebar) ── */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
          <Route index element={<DashboardPage />} />
          <Route path="products"   element={<ProductsPage />} />
          <Route path="orders"     element={<OrdersPage />} />
          <Route path="customers"  element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="campaign"   element={<CampaignPage />} />
        </Route>


        {/* ── Customer-facing store (MainLayout) ── */}
        <Route path="/*" element={
          <MainLayout state={state}>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<CategorySelection onSelectCategory={state.handleSelectCategory} categories={state.categories} />} />

                <Route path="/products" element={
                  activeCategory
                    ? <ProductPage
                        selectedCategory={activeCategory}
                        productMap={state.productMap}
                        onAddToCart={state.handleAddToCart}
                        onSelectProduct={state.handleSelectProduct}
                        activeTab={state.activeTab}
                        setActiveTab={state.setActiveTab}
                        cartItems={state.cartItems}
                        onBuyNow={state.handleBuyNow}
                        subcategories={state.subcategories}
                        productsLoaded={state.productsLoaded}
                      />
                    : <Navigate to="/" replace />
                } />

                <Route path="/products/:id" element={
                  state.selectedProduct
                    ? <ProductDetailsPage
                        product={state.selectedProduct}
                        category={activeCategory}
                        productMap={state.productMap}
                        onAddToCart={state.handleAddToCart}
                        onBack={state.handleBackToProductPage}
                        onSelectProduct={state.handleSelectProduct}
                        isTransitioning={state.transitionState === 'animating_in' || state.transitionState === 'animating_out'}
                        onMeasured={state.setTargetCardRect}
                        cartItems={state.cartItems}
                        onBuyNow={state.handleBuyNow}
                        categories={state.categories}
                        onSelectCategory={state.handleSelectCategory}
                      />
                    : state.productsLoaded
                      ? <Navigate to="/products" replace />
                      : <LoadingFallback />
                } />

                <Route path="/cart" element={
                  <CartPage
                    cartItems={state.cartItems}
                    onUpdateQuantity={state.handleUpdateCartQuantity}
                    onRemoveItem={state.handleRemoveCartItem}
                    onAddToCart={state.handleAddToCart}
                    onSelectProduct={state.handleSelectProduct}
                    onClearCart={state.handleClearCart}
                    productMap={state.productMap}
                    category={activeCategory}
                    productsLoaded={state.productsLoaded}
                  />
                } />

                {/* Auth */}
                <Route path="/login"  element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />

                {/* Customer Care & Campaign */}
                <Route path="/shine-with-us" element={<ShineWithUsPage />} />
                <Route path="/customer-care" element={<CustomerCarePage />} />
                <Route path="/customer-care/shipping-policy" element={<ShippingPolicyPage />} />

                <Route path="/customer-care/returns-replacements" element={<ReturnsReplacementsPage />} />
                <Route path="/customer-care/cancellation-policy" element={<CancellationPolicyPage />} />
                <Route path="/customer-care/product-care" element={<ProductCarePage />} />
                <Route path="/customer-care/faq" element={<FaqPage />} />

                {/* Legal */}
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />

                {/* Account */}
                <Route path="/account"            element={<AccountPage />} />
                <Route path="/account/profile"    element={<ProfilePage />} />
                <Route path="/account/addresses"  element={<AddressesPage />} />
                <Route path="/account/orders"     element={<OrderHistoryPage />} />
                <Route path="/account/help-center" element={<HelpCenterPage />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </MainLayout>
        } />
      </Routes>
    </Suspense>
  );
}
