const { PrismaClient } = require('@prisma/client');

let prisma;

// Automatically constrain database connection limit if absent,
// preventing Prisma from opening 30+ simultaneous PostgreSQL sockets on shared hosting.
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('connection_limit')) {
  const separator = process.env.DATABASE_URL.includes('?') ? '&' : '?';
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${separator}connection_limit=5&pool_timeout=10`;
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
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 5,
    });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
    });
  } catch (err) {
    console.warn('Prisma adapter initialization skipped, falling back to standard client:', err.message);
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
    });
  }
} else {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
  });
}

module.exports = prisma;

