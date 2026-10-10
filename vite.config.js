import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

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

// Older in-app browsers (iOS 14+, Android WebView/Chrome 87+).
const LEGACY_TARGETS = ['es2020', 'chrome87', 'safari14', 'firefox78', 'edge88'];

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viewportUnitFallbacks(),
  ],
  build: {
    target: LEGACY_TARGETS,
    cssTarget: LEGACY_TARGETS,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('three')) return 'vendor-three';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
        }
      }
    }
  }
})

