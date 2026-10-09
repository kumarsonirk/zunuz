// Forgot the admin login security answer? This switches the question OFF so
// admins can sign in with email + password again; then set a new answer in
// Settings → Admin login security.
//   node scripts/reset-admin-security-question.js
// (Run on the server, with the same DATABASE_URL as the API. The API picks
// the change up within a minute — restart it to apply immediately.)
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const r = await prisma.storeSetting.deleteMany({ where: { key: { in: ['adminSecurityAnswerHash', 'adminSecurityAnswer'] } } });
  console.log(r.count
    ? 'Admin security question switched off. Sign in with email + password, then set a new answer in Settings → Admin login security.'
    : 'No security answer was set — nothing to reset.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
