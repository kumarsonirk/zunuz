// One shared Prisma client (one connection pool) for the whole API.
// Every route/lib used to create its own client — 45 pools at once, which
// can exhaust the live database's connection limit under load.
const { PrismaClient } = require('@prisma/client');

const prisma = global.__zunuzPrisma || new PrismaClient();
// Dev (nodemon reloads): reuse the client across reloads too.
if (process.env.NODE_ENV !== 'production') global.__zunuzPrisma = prisma;

module.exports = prisma;
