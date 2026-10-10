import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { loadSettings } from './store/settings.js'
import { loadContent } from './store/content.js'
import { installImageFallback } from './utils/imageFallback.js'

// Broken storefront images → a product photo instead (see utils/imageFallback.js).
installImageFallback()

// In-app browsers (Instagram, Facebook, LinkedIn…) run an embedded WebView that
// can skip painting GPU-promoted layers under memory pressure, so sections
// randomly went missing. Flag them so index.css turns layer hints off.
if (/Instagram|FBAN|FBAV|FB_IAB|LinkedInApp|Line\//i.test(navigator.userAgent || '')) {
  document.documentElement.classList.add('in-app-browser')
}

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
