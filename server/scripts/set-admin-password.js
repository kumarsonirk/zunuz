// Sets (or resets) an admin's password.
//
// Run from the server/ directory:
//   node scripts/set-admin-password.js admin@zunuz.com "YourNewPassword123"
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Usage: node scripts/set-admin-password.js <email> <new-password>');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('Password must be at least 6 characters.');
    process.exit(1);
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    console.error(`No admin found with email "${email}".`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.admin.update({
    where: { email },
    data: { passwordHash, failedAttempts: 0, lockedUntil: null },
  });

  console.log(`Password updated for ${email}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
