// One-off: converts public/ raster images to WebP. Run: node scripts/convert-to-webp.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

const files = fs.readdirSync(publicDir).filter(f => /\.(png|jpe?g)$/i.test(f));

(async () => {
  for (const file of files) {
    const inPath = path.join(publicDir, file);
    const outPath = path.join(publicDir, file.replace(/\.(png|jpe?g)$/i, '.webp'));
    const before = fs.statSync(inPath).size;
    await sharp(inPath).webp({ quality: 82 }).toFile(outPath);
    const after = fs.statSync(outPath).size;
    console.log(`${file} -> ${path.basename(outPath)}  ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
  }
})();
