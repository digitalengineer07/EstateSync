const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');

// Load env vars
require('dotenv').config();

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
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
  max: 200, // Limit each IP to 200 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too Many Requests'
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

// Basic route for testing
app.get('/', (req, res) => {
  res.send('EstateSync API is running with Full Accounting & Idempotency Engine');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err.stack);
  res.status(500).json({ success: false, message: 'Server Error', error: err.message });
});

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

module.exports = app;
