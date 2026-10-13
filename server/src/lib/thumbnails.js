const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Resized copies of uploaded product photos, for cards and strips (the
// storefront asks for them via src/utils/productImage.js):
//   GET /uploads/<name>.w400.webp  → <name>.webp|.jpg|.jpeg|.png at 400px wide
//   GET /uploads/<name>.w800.webp  → … at 800px wide
// Made on first request with sharp and kept in uploads/thumbs, so every
// later request is a plain file read — and the browser caches it for a year
// (names never change). Uploads are also pre-sized when they're saved
// (makeThumbnails), so a new product's first visitor doesn't wait. Only the
// widths below are allowed, and names are plain [A-Za-z0-9_-], so the route
// can't be used to read other files or to make endless sizes.
const WIDTHS = [400, 800];
const SOURCE_EXTS = ['.webp', '.jpg', '.jpeg', '.png'];
const PATTERN = /^\/([\w-]+)\.w(\d+)\.webp$/;
const CACHE = 'public, max-age=31536000, immutable';

function thumbsDirOf(uploadsDir) {
  const dir = path.join(uploadsDir, 'thumbs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function writeThumb(input, width, outFile) {
  // Write to a temp name, then rename, so a half-written file is never served.
  const tmp = `${outFile}.${process.pid}.${Date.now()}.tmp`;
  await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toFile(tmp);
  await fs.promises.rename(tmp, outFile);
}

// Called by the upload route with the already-resized image.
async function makeThumbnails(uploadsDir, base, input) {
  const dir = thumbsDirOf(uploadsDir);
  await Promise.all(WIDTHS.map((w) => writeThumb(input, w, path.join(dir, `${base}.w${w}.webp`))));
}

// Express middleware, mounted at /uploads before the static handler.
function thumbnailRoute(uploadsDir) {
  const dir = thumbsDirOf(uploadsDir);
  const inFlight = new Map(); // one sharp job per file, however many requests

  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const m = req.path.match(PATTERN);
    if (!m) return next();
    const [, name, w] = m;
    const width = Number(w);
    if (!WIDTHS.includes(width)) return res.status(404).end();

    const outFile = path.join(dir, `${name}.w${width}.webp`);
    const send = () => res.set('Cache-Control', CACHE).type('image/webp').sendFile(outFile);
    if (fs.existsSync(outFile)) return send();

    const source = SOURCE_EXTS.map((ext) => path.join(uploadsDir, name + ext)).find((f) => fs.existsSync(f));
    if (!source) return res.status(404).end();
    try {
      if (!inFlight.has(outFile)) {
        inFlight.set(outFile, writeThumb(source, width, outFile).finally(() => inFlight.delete(outFile)));
      }
      await inFlight.get(outFile);
      return send();
    } catch (err) {
      console.error('Thumbnail failed:', name, err.message);
      return res.status(500).end();
    }
  };
}

module.exports = { thumbnailRoute, makeThumbnails, THUMB_WIDTHS: WIDTHS };
