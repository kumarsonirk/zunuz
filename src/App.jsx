import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Main store layout + pages
import MainLayout from './components/MainLayout';
import CategorySelection from './pages/CategorySelection';
import ProductPage from './pages/ProductPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import CartPage from './pages/CartPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import CustomerCarePage from './pages/CustomerCarePage';
import ShippingPolicyPage from './pages/customer-care/ShippingPolicyPage';
import ReturnsReplacementsPage from './pages/customer-care/ReturnsReplacementsPage';
import CancellationPolicyPage from './pages/customer-care/CancellationPolicyPage';
import ProductCarePage from './pages/customer-care/ProductCarePage';
import FaqPage from './pages/customer-care/FaqPage';
import HelpCenterPage from './pages/account/HelpCenterPage';
import { useAppState } from './hooks/useAppState';

// Customer auth page (mobile OTP)
import OtpAuthPage from './pages/auth/OtpAuthPage';

// Customer account pages
import AccountPage from './pages/account/AccountPage';
import ProfilePage from './pages/account/ProfilePage';
import AddressesPage from './pages/account/AddressesPage';
import OrderHistoryPage from './pages/account/OrderHistoryPage';

// Admin pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import ProductsPage from './pages/admin/ProductsPage';
import OrdersPage from './pages/admin/OrdersPage';
import CustomersPage from './pages/admin/CustomersPage';
import CustomerDetailPage from './pages/admin/CustomerDetailPage';
import CategoriesPage from './pages/admin/CategoriesPage';

function AdminGuard({ children }) {
  const token = localStorage.getItem('zunuz_admin_token');
  return token ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  const state = useAppState();

  return (
    <Routes>
      {/* ── Admin (no MainLayout, own sidebar) ── */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
        <Route index element={<DashboardPage />} />
        <Route path="products"   element={<ProductsPage />} />
        <Route path="orders"     element={<OrdersPage />} />
        <Route path="customers"  element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="categories" element={<CategoriesPage />} />
      </Route>

      {/* ── Customer-facing store (MainLayout) ── */}
      <Route path="/*" element={
        <MainLayout state={state}>
          <Routes>
            <Route path="/" element={<CategorySelection onSelectCategory={state.handleSelectCategory} />} />

            <Route path="/products" element={
              state.selectedCategory
                ? <ProductPage
                    selectedCategory={state.selectedCategory}
                    productMap={state.productMap}
                    likedProducts={state.likedProducts}
                    onLikeToggle={state.handleLikeToggle}
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
                    category={state.selectedCategory}
                    productMap={state.productMap}
                    likedProducts={state.likedProducts}
                    onLikeToggle={state.handleLikeToggle}
                    onAddToCart={state.handleAddToCart}
                    onBack={state.handleBackToProductPage}
                    onSelectProduct={state.handleSelectProduct}
                    isTransitioning={state.transitionState === 'animating_in' || state.transitionState === 'animating_out'}
                    onMeasured={state.setTargetCardRect}
                    cartItems={state.cartItems}
                    onBuyNow={state.handleBuyNow}
                  />
                : <Navigate to="/products" replace />
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
                category={state.selectedCategory}
                productsLoaded={state.productsLoaded}
              />
            } />

            {/* Auth */}
            <Route path="/login"  element={<OtpAuthPage />} />
            <Route path="/signup" element={<OtpAuthPage />} />

            {/* Customer Care */}
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
        </MainLayout>
      } />
    </Routes>
  );
}
