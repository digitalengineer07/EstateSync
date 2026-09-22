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

// Security Middlewares - allow cross-origin requests from Hostinger / Render / local dev
app.use(helmet({
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

const allowedOrigins = [
  'https://estatesync.devoxa.in',
  'http://estatesync.devoxa.in',
  'https://www.estatesync.devoxa.in',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000'
];

if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(',').forEach(o => {
    const trimmed = o.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) allowedOrigins.push(trimmed);
  });
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.devoxa.in') ||
      origin.endsWith('.hostingersite.com') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      process.env.CORS_ORIGIN === '*' ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    return callback(null, false);
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
app.use(express.json());

// Set up Session Management
app.use(session({
  secret: process.env.JWT_SECRET || 'supersecretjwtkey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Set up rate limiter using express-rate-limit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Generous limit to prevent false positives with dashboards, SWR polling & Render reverse proxy
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' }
});

// Apply the rate limiting middleware to all requests
app.use(apiLimiter);

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

// Basic route for testing
app.get('/', (req, res) => {
  res.send('EstateSync API is running with Full Accounting & Idempotency Engine');
});

app.post('/test-post', (req, res) => {
  console.log('Received POST to /test-post with body:', req.body);
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
    res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err.stack);
  res.status(500).json({ success: false, message: 'Server Error', error: err.message });
});

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
