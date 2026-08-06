// Samples a photo's average bottom-strip color directly from an already-
// loaded <img> element rather than fetching src again via a fresh Image() —
// that second fetch used to be the only way to sample colors, and on a slow
// connection it could take far longer than the visible photo itself, or
// never finish. The visible photo is already decoded in memory, so this is
// synchronous and has nothing left to time out.
export function sampleBottomColorFromElement(img) {
  try {
    const w = 16, h = 16;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const sh = Math.max(1, Math.round(ih * 0.35));
    ctx.drawImage(img, 0, ih - sh, iw, sh, 0, 0, w, h);
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
    return { r, g, b, luminance };
  } catch {
    return null;
  }
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
