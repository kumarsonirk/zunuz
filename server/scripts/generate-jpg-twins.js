// One-off: for every existing .webp file in server/uploads that doesn't
// already have a .jpg twin, generates one — backfills the email-compatibility
// fix in routes/admin/upload.js for photos uploaded before that fix existed.
// Run (on the server, where the uploads volume actually lives):
//   node scripts/generate-jpg-twins.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const uploadsDir = path.join(__dirname, '../uploads');

(async () => {
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.webp'));
  console.log(`Found ${files.length} .webp file(s) in uploads/.`);

  let created = 0;
  for (const file of files) {
    const jpgName = file.replace(/\.webp$/, '.jpg');
    const jpgPath = path.join(uploadsDir, jpgName);
    if (fs.existsSync(jpgPath)) continue;
    await sharp(path.join(uploadsDir, file)).jpeg({ quality: 82 }).toFile(jpgPath);
    console.log(`Created ${jpgName}`);
    created++;
  }
  console.log(`Done. Created ${created} new .jpg twin(s).`);
})();
