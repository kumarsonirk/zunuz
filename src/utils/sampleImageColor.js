// Samples the average color of a region of a photo via an offscreen image, so
// UI around a product photo (scrims, thumbnail backgrounds) can be tinted to
// match that specific photo instead of guessing one fixed color that only
// happens to match some product photos and not others. Runs on a separate
// Image (not the visible <img>), so a CORS hiccup here just skips the
// adaptive color — it never breaks the actual photo.
function sampleRegion(src, getRegion) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const w = 16, h = 16;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          const { sx, sy, sw, sh } = getRegion(img.naturalWidth, img.naturalHeight);
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
          const { data } = ctx.getImageData(0, 0, w, h);
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i]; g += data[i + 1]; b += data[i + 2];
            count++;
          }
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          resolve({ r, g, b, luminance });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    } catch {
      resolve(null);
    }
  });
}

// Bottom strip — where a text scrim typically sits over a full photo.
export function sampleBottomColor(src) {
  return sampleRegion(src, (w, h) => {
    const sh = Math.max(1, Math.round(h * 0.35));
    return { sx: 0, sy: h - sh, sw: w, sh };
  });
}

// All four corners, averaged — for small centered-product thumbnails
// (jewelry, etc.) the corners are almost always pure backdrop, not the
// product itself. Averaging all four (not just one) avoids a mismatched
// result when the backdrop is a gradient/vignette rather than a flat color,
// where a single corner can read noticeably lighter or darker than the rest.
export function sampleCornerColor(src) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const w = 16, h = 16;
          const halfW = w / 2, halfH = h / 2;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          const iw = img.naturalWidth, ih = img.naturalHeight;
          const cw = Math.max(1, Math.round(iw * 0.12));
          const ch = Math.max(1, Math.round(ih * 0.12));
          // Draw each corner into its own quadrant of one canvas, so the
          // average below blends all four together.
          ctx.drawImage(img, 0, 0, cw, ch, 0, 0, halfW, halfH);                       // top-left
          ctx.drawImage(img, iw - cw, 0, cw, ch, halfW, 0, halfW, halfH);             // top-right
          ctx.drawImage(img, 0, ih - ch, cw, ch, 0, halfH, halfW, halfH);             // bottom-left
          ctx.drawImage(img, iw - cw, ih - ch, cw, ch, halfW, halfH, halfW, halfH);   // bottom-right
          const { data } = ctx.getImageData(0, 0, w, h);
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i]; g += data[i + 1]; b += data[i + 2];
            count++;
          }
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          resolve({ r, g, b, luminance });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    } catch {
      resolve(null);
    }
  });
}
