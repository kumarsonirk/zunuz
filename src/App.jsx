import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import CategorySelection from './components/CategorySelection';
import ProductPage from './components/ProductPage';
import ProductDetailsPage from './components/ProductDetailsPage';
import CartPage from './components/CartPage';
import { useAppState } from './hooks/useAppState';

export default function App() {
  const state = useAppState();

  return (
    <MainLayout state={state}>
      <Routes>
        <Route
          path="/"
          element={
            <CategorySelection
              onSelectCategory={state.handleSelectCategory}
            />
          }
        />
        <Route
          path="/products"
          element={
            state.selectedCategory ? (
              <ProductPage
                selectedCategory={state.selectedCategory}
                likedProducts={state.likedProducts}
                onLikeToggle={state.handleLikeToggle}
                onAddToCart={state.handleAddToCart}
                onSelectProduct={state.handleSelectProduct}
                activeTab={state.activeTab}
                setActiveTab={state.setActiveTab}
                cartItems={state.cartItems}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/products/:id"
          element={
            state.selectedProduct ? (
              <ProductDetailsPage
                product={state.selectedProduct}
                category={state.selectedCategory}
                likedProducts={state.likedProducts}
                onLikeToggle={state.handleLikeToggle}
                onAddToCart={state.handleAddToCart}
                onBack={state.handleBackToProductPage}
                onSelectProduct={state.handleSelectProduct}
                isTransitioning={state.transitionState === 'animating_in' || state.transitionState === 'animating_out'}
                onMeasured={state.setTargetCardRect}
                cartItems={state.cartItems}
              />
            ) : (
              <Navigate to="/products" replace />
            )
          }
        />
        <Route
          path="/cart"
          element={
            <CartPage
              cartItems={state.cartItems}
              onUpdateQuantity={state.handleUpdateCartQuantity}
              onRemoveItem={state.handleRemoveCartItem}
              onAddToCart={state.handleAddToCart}
              onSelectProduct={state.handleSelectProduct}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}
