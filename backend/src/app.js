// Constrain libuv worker threads to prevent process & thread exhaustion on CloudLinux/Hostinger
if (!process.env.UV_THREADPOOL_SIZE) {
  process.env.UV_THREADPOOL_SIZE = '1';
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');

// Load env vars
require('dotenv').config();

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Hostinger/Render load balancer)

// Security: Disable express fingerprinting header
app.disable('x-powered-by');

// Security Middlewares - Comprehensive Helmet configuration
app.use(helmet({
  hidePoweredBy: true,
  noSniff: true,
  xssFilter: true,
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  frameguard: { action: 'deny' },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  crossOriginEmbedderPolicy: false
}));

// Log OPTIONS requests to test if Hostinger is dropping them before they reach Node
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received:', req.headers.origin);
  }
  next();
});

const isAllowedOrigin = require('./middleware/corsOrigins').createOriginValidator();

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, isAllowedOrigin(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Idempotency-Key',
    'idempotency-key',
    'x-idempotency-key',
    'X-Idempotency-Key',
    'Accept',
    'Origin',
    'X-Requested-With'
  ]
};

app.use(cors(corsOptions));

// Payload size limits to prevent volumetric payload DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Input sanitization against Prototype Pollution & parameter injection
const { sanitizeInput } = require('./middleware/sanitizerMiddleware');
app.use(sanitizeInput);

// Hardened Session Management
app.use(session({
  name: 'estatesync_sid',
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'supersecretjwtkey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Global API rate limiting
const { globalApiLimiter } = require('./middleware/rateLimitMiddleware');
app.use('/api/', globalApiLimiter);

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const fundRequestRoutes = require('./routes/fundRequestRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const accountRoutes = require('./routes/accountRoutes');
const journalRoutes = require('./routes/journalRoutes');
const auditRoutes = require('./routes/auditRoutes');
const customerRoutes = require('./routes/customerRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const treasuryRoutes = require('./routes/treasuryRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const accountingPeriodRoutes = require('./routes/accountingPeriodRoutes');
const customerBillingRoutes = require('./routes/customerBillingRoutes');
const walletRoutes = require('./routes/walletRoutes');
const noteRoutes = require('./routes/noteRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const searchRoutes = require('./routes/searchRoutes');

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/fund-requests', fundRequestRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/journals', journalRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/treasury', treasuryRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/accounting/periods', accountingPeriodRoutes);
app.use('/api/v1/billing', customerBillingRoutes);
app.use('/api/v1/wallets', walletRoutes);
app.use('/api/v1/notes', noteRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/documents', require('./routes/documentRoutes'));

// Basic route for testing
app.get('/', (req, res) => {
  res.send('EstateSync API is running with Full Accounting & Idempotency Engine');
});

// Development-only diagnostic endpoints (restricted in production)
if (process.env.NODE_ENV !== 'production') {
  app.post('/test-post', (req, res) => {
    res.json({ success: true, message: 'POST body received', body: req.body });
  });

  app.get('/test-db', async (req, res) => {
    try {
      const { Pool } = require('pg');
      const pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5000 
      });
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      await pool.end();
      res.json({ success: true, time: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Database test error' });
    }
  });
}

// Secure centralized error handling middleware
const { errorHandler } = require('./middleware/errorMiddleware');
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
const isPassenger = typeof(PhusionPassenger) !== 'undefined' || !!process.env.PASSENGER_APP_ENV;
const listenTarget = isPassenger ? 'passenger' : PORT;

const server = app.listen(listenTarget, async () => {
  console.log(`Server running on ${listenTarget}`);

  // Proactive Database Schema Integrity Check (opt-in via AUDIT_DB_ON_START to prevent startup lag on Hostinger)
  if (process.env.AUDIT_DB_ON_START === 'true') {
    try {
      const { auditDatabaseIntegrity } = require('../scripts/audit_database_integrity');
      const result = await auditDatabaseIntegrity({ silent: true });
      if (!result.success) {
        console.warn(`\n⚠️  [DATABASE INTEGRITY WARNING] ${result.issues.length} schema mismatches detected!`);
        result.issues.slice(0, 5).forEach(iss => console.warn(`   • ${iss}`));
        console.warn('👉 Run `npx prisma db push` or `npm run audit:db` to align database schema.\n');
      } else {
        console.log('✅ Database schema parity verified: All tables & columns intact.');
      }
    } catch (err) {
      console.warn('Database schema integrity check skipped:', err.message);
    }
  }
});

server.on('error', (err) => {
  console.error('[Backend Server Listen Error]:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${listenTarget} is already in use. Waiting 5s before exiting to prevent Passenger spawn loop...`);
    setTimeout(() => process.exit(1), 5000);
  }
});

process.on('uncaughtException', (err) => {
  console.error('[Backend Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Backend Unhandled Rejection]:', reason);
});

module.exports = app;
