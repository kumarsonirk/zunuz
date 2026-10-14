import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { SEO_PAGES, HOME_JSON_LD } from './src/seo/pages.js'
import { withSeo } from './src/seo/html.js'

// In-app browsers (Instagram, Facebook) on older phones don't know the newer
// viewport/container units (dvh, svh, lvh, cqw, cqh). A declaration using
// one is dropped entirely — e.g. a full-screen `height:100dvh` section
// collapses to nothing. After the build, every such declaration gets an
// older-unit fallback written just before it (dvh→vh, cqw→vw, cqh→vh);
// modern browsers still use the original.
const NEW_UNIT = /(\d*\.?\d+)(dvh|svh|lvh|cqw|cqh|cqi|cqb)\b/;
function viewportUnitFallbacks() {
  let outDir = 'dist';
  return {
    name: 'viewport-unit-fallbacks',
    apply: 'build',
    enforce: 'post',
    configResolved(cfg) { outDir = path.resolve(cfg.root, cfg.build.outDir); },
    // Runs once the build has fully finished writing (the CSS file is
    // rewritten late, so earlier hooks' edits were lost).
    closeBundle() {
      const dir = path.join(outDir, 'assets');
      if (!fs.existsSync(dir)) return;
      for (const name of fs.readdirSync(dir)) {
        if (!name.endsWith('.css')) continue;
        const full = path.join(dir, name);
        const css = fs.readFileSync(full, 'utf8').replace(/([{;])([a-z][a-z-]*):([^;{}]+)/g, (m, sep, prop, val) => {
          if (!NEW_UNIT.test(val)) return m;
          const old = val
            .replace(/(\d*\.?\d+)(?:dvh|svh|lvh|cqh|cqb)\b/g, '$1vh')
            .replace(/(\d*\.?\d+)(?:cqw|cqi)\b/g, '$1vw');
          return `${sep}${prop}:${old};${prop}:${val}`;
        });
        fs.writeFileSync(full, css);
      }
    },
  };
}

// main.jsx waits for the store settings + page content (API, ≤1.5s on a
// first visit) before importing App.jsx, so the app reads real values from
// its first render. That wait used to delay even *downloading* the app's
// code. This adds <link rel="modulepreload"> for App.jsx's chunk and every
// chunk it statically imports, so the browser fetches (but doesn't run)
// them straight away, in parallel with those API calls.
function preloadAppChunks() {
  return {
    name: 'preload-app-chunks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle || {};
        const chunks = Object.values(bundle).filter((c) => c.type === 'chunk');
        const app = chunks.find((c) => c.facadeModuleId && /\/src\/App\.jsx$/.test(c.facadeModuleId));
        if (!app) return html;
        const files = new Set();
        const visit = (name) => {
          if (files.has(name)) return;
          files.add(name);
          (bundle[name]?.imports || []).forEach(visit);
        };
        visit(app.fileName);
        const already = new Set(chunks.filter((c) => c.isEntry).flatMap((c) => [c.fileName, ...c.imports]));
        return [...files].filter((f) => !already.has(f)).map((f) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: '', href: `/${f}` },
          injectTo: 'head',
        }));
      },
    },
  };
}

// Search engines and link previews (WhatsApp, Instagram, Bing) often read a
// page's HTML without running its JavaScript, so a single-page app looks
// the same — "ZUNUZ", no description — on every URL. After the build this
// writes the real title / description / canonical / Open Graph tags
// (src/seo/pages.js) into:
//   dist/index.html            → home page (+ Organization / WebSite data)
//   dist/<path>/index.html     → each other fixed page (/shop, /earrings…)
//   dist/app.html              → untouched shell for every other route
//                                (vercel.json rewrites unknown paths to it)
// Tags carry data-seo; main.jsx removes them when the app starts and the
// page's own <Seo> sets the same values. Product pages are done per
// request by api/product-page.js. Tag writing: src/seo/html.js.
function prerenderSeoPages() {
  let outDir = 'dist'
  return {
    name: 'prerender-seo-pages',
    apply: 'build',
    configResolved(cfg) { outDir = path.resolve(cfg.root, cfg.build.outDir) },
    closeBundle() {
      const indexFile = path.join(outDir, 'index.html')
      if (!fs.existsSync(indexFile)) return
      const shell = fs.readFileSync(indexFile, 'utf8')
      fs.writeFileSync(path.join(outDir, 'app.html'), shell)
      for (const [pagePath, page] of Object.entries(SEO_PAGES)) {
        const html = withSeo(shell, { ...page, path: pagePath, jsonLd: pagePath === '/' ? HOME_JSON_LD : [] })
        const file = pagePath === '/' ? indexFile : path.join(outDir, pagePath.slice(1), 'index.html')
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, html)
      }
    },
  }
}

// Older in-app browsers (iOS 14+, Android WebView/Chrome 87+).
const LEGACY_TARGETS = ['es2020', 'chrome87', 'safari14', 'firefox78', 'edge88'];

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viewportUnitFallbacks(),
    preloadAppChunks(),
    prerenderSeoPages(),
  ],
  build: {
    target: LEGACY_TARGETS,
    cssTarget: LEGACY_TARGETS,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
        }
      }
    }
  }
})

