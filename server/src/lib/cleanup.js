const fs = require('fs');
const path = require('path');

const prisma = require('./prisma');

// Return photos/videos are uploaded one by one (POST /api/returns/upload)
// before the request is submitted, so a customer who gives up halfway leaves
// files behind. Every 6 hours, delete return-* uploads older than a day that
// no ReturnRequest refers to. Only files with the return- prefix are ever
// touched (product images etc. are left alone).

const uploadsDir = path.join(__dirname, '../../uploads');
const GRACE_MS = 24 * 60 * 60 * 1000; // leave time to finish the form
const EVERY_MS = 6 * 60 * 60 * 1000;
// return-<time>-<rand> (older uploads) or return-<customerId>-<time>-<rand>.
const RETURN_FILE = /^return-(\d+-)?\d+-\d+\.(webp|mp4|mov)$/;

async function cleanReturnUploads(now = Date.now()) {
  let names;
  try { names = await fs.promises.readdir(uploadsDir); } catch { return { removed: 0 }; }
  const candidates = names.filter((n) => RETURN_FILE.test(n));
  if (!candidates.length) return { removed: 0 };

  // Every file name any return request refers to.
  const rows = await prisma.returnRequest.findMany({ select: { media: true } });
  const used = new Set();
  for (const r of rows) {
    let media;
    try { media = JSON.parse(r.media || '[]'); } catch { media = []; }
    if (!Array.isArray(media)) continue;
    for (const m of media) {
      const name = String(m?.url || '').split('/').pop();
      if (name) used.add(name);
    }
  }

  let removed = 0;
  for (const name of candidates) {
    if (used.has(name)) continue;
    const file = path.join(uploadsDir, name);
    try {
      const { mtimeMs } = await fs.promises.stat(file);
      if (now - mtimeMs < GRACE_MS) continue;
      await fs.promises.unlink(file);
      removed += 1;
    } catch { /* already gone / locked — try next time */ }
  }
  if (removed) console.log(`Cleanup: removed ${removed} unused return upload(s).`);
  return { removed };
}

function startCleanupScheduler() {
  const run = () => cleanReturnUploads().catch((e) => console.error('Return upload cleanup failed:', e));
  setTimeout(run, 60 * 1000).unref(); // shortly after start-up
  setInterval(run, EVERY_MS).unref();
}

module.exports = { cleanReturnUploads, startCleanupScheduler };
