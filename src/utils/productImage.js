// Smaller copies of uploaded product photos for cards and strips. Uploads are
// saved at up to 1600px wide; the API serves resized WebP copies at
// /uploads/<name>.w400.webp and .w800.webp (made on first request, then
// cached — see server/src/lib/thumbnails.js). Anything that isn't an upload
// (e.g. /public art) is left as it is. Images using these carry
// data-original; if a copy can't be loaded, the image error handler
// (utils/imageFallback.js) switches back to that original.
const UPLOAD = /^(.*\/uploads\/)([\w-]+)\.(?:webp|jpe?g|png)$/i;

export function thumbUrl(url, width) {
  const m = typeof url === 'string' && url.match(UPLOAD);
  return m ? `${m[1]}${m[2]}.w${width}.webp` : url;
}

// srcSet for an upload: 400 / 800 copies plus the original (1600) for big,
// sharp screens. undefined for anything else, so <img src> is used as-is.
export function thumbSrcSet(url) {
  if (typeof url !== 'string' || !UPLOAD.test(url)) return undefined;
  return `${thumbUrl(url, 400)} 400w, ${thumbUrl(url, 800)} 800w, ${url} 1600w`;
}
