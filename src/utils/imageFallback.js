import { getCatalogSnapshot, loadCatalog } from '../store/catalog';

// Storefront safety net: when an <img> fails to load (missing file, bad
// upload, wrong admin link), swap in a real product photo from the catalogue
// so no section ever shows a broken image. One listener for the whole app
// (image `error` events don't bubble, so it listens in the capture phase).
//
// Not on product pages (a stand-in would misrepresent the product) or in the
// admin (admins need to see what's actually broken). Logos and tiny icons are
// skipped. Each image tries up to 3 different product photos, then gives up.
const SKIP_PATH = /^\/(products\/|admin)/;
const MAX_TRIES = 3;

function productPhotos() {
  const { products = [] } = getCatalogSnapshot() || {};
  return products.filter((p) => p.image && p.stock > 0).map((p) => p.image);
}

// Stable pick per failed image, so the same slot always gets the same photo.
function pick(list, seed, attempt) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[(h + attempt) % list.length];
}

function onImageError(e) {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (SKIP_PATH.test(window.location.pathname)) return;
  if (/logo|favicon|icon/i.test(img.getAttribute('src') || '')) return;
  const tries = Number(img.dataset.fallbackTries || 0);
  if (tries >= MAX_TRIES) return;

  const swap = () => {
    const photos = productPhotos();
    if (!photos.length) return;
    const seed = img.dataset.fallbackFor || img.getAttribute('src') || img.alt || 'img';
    img.dataset.fallbackFor = seed;
    img.dataset.fallbackTries = String(tries + 1);
    // A <picture>'s <source> wins over img.src — drop them so the swap shows.
    if (img.parentElement?.tagName === 'PICTURE') {
      img.parentElement.querySelectorAll('source').forEach((s) => s.remove());
    }
    img.removeAttribute('srcset');
    img.src = pick(photos, seed, tries);
  };

  if (productPhotos().length) swap();
  else loadCatalog().then(swap, () => {});
}

export function installImageFallback() {
  if (typeof window === 'undefined' || window.__zunuzImgFallback) return;
  window.__zunuzImgFallback = true;
  window.addEventListener('error', onImageError, true);
}
