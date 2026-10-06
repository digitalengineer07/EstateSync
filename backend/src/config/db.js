const { PrismaClient } = require('@prisma/client');

let prisma;
const log = process.env.PROFILE_READ_QUERIES === 'true'
  ? [{ emit: 'event', level: 'query' }, 'error']
  : process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'];

// Automatically constrain database connection limit if absent,
// preventing Prisma from opening 30+ simultaneous PostgreSQL sockets on shared hosting.
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = require('../utils/databaseConnection').databaseUrlWithDefaults(process.env.DATABASE_URL);
}

// If driver adapter is explicitly enabled and not running on binary engine (e.g., Windows ARM64),
// use the pg pool adapter for serverless cold start handling.
// Otherwise, use native PrismaClient connection engine which works reliably across all platforms.
if (process.env.USE_PRISMA_ADAPTER === 'true') {
  try {
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: Number(new URL(process.env.DATABASE_URL).searchParams.get('connect_timeout') || 10) * 1000,
      idleTimeoutMillis: 30000,
      max: 5,
    });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({
      adapter,
      log
    });
  } catch (err) {
    console.warn('Prisma adapter initialization skipped, falling back to standard client:', err.message);
    prisma = new PrismaClient({
      log
    });
  }
} else {
  prisma = new PrismaClient({
    log
  });
}

module.exports = require('../utils/transactionContext').contextualClient(prisma);

