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
  // Light mode for in-app browsers: their WebViews lose track of scroll-linked
  // animations (half-drawn sections) and can run out of memory on the full
  // effects (black screen). Every animated section already has a "reduced
  // motion" path that shows its content straight away with no scroll
  // animation / smooth-scroll engine — report that preference here so those
  // paths are used.
  const realMatchMedia = window.matchMedia.bind(window)
  window.matchMedia = (query) => {
    if (/prefers-reduced-motion\s*:\s*reduce/i.test(query)) {
      const noop = () => {}
      return { matches: true, media: query, onchange: null, addListener: noop, removeListener: noop, addEventListener: noop, removeEventListener: noop, dispatchEvent: () => false }
    }
    return realMatchMedia(query)
  }
}

// Store settings (delivery fee, payment methods, maintenance, contact) and
// the editable storefront copy (Homepage & Banners) are loaded before App's
// modules are evaluated — App is imported afterwards so everything reads the
// real values from the first render (no text swapping after paint).
Promise.all([loadSettings(), loadContent()])
  .then(() => import('./App.jsx'))
  .then(({ default: App }) => {
    // SEO tags written into the HTML for crawlers (src/seo/html.js): each
    // page's <Seo> sets the same values once it renders, so drop these
    // first to avoid duplicate canonical / description tags.
    document.querySelectorAll('head [data-seo]').forEach((el) => el.remove())
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
    // index.html's static loader copy (#boot-ld) is normally handed over by
    // the home page's own loader. If this render didn't show one (e.g.
    // maintenance page), remove the copy now rather than leave it up.
    setTimeout(() => {
      if (!document.querySelector('#root [role="status"][aria-label="Loading"]')) document.getElementById('boot-ld')?.remove()
    }, 300)
  })
