import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { loadSettings } from './store/settings.js'
import { loadContent } from './store/content.js'

// Store settings (delivery fee, payment methods, maintenance, contact) and
// the editable storefront copy (Homepage & Banners) are loaded before App's
// modules are evaluated — App is imported afterwards so everything reads the
// real values from the first render (no text swapping after paint).
Promise.all([loadSettings(), loadContent()])
  .then(() => import('./App.jsx'))
  .then(({ default: App }) => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <HelmetProvider>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </HelmetProvider>
      </StrictMode>,
    )
  })
