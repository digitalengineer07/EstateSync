const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'backend');

const dirs = [
  'src/config',
  'src/controller',
  'src/middleware',
  'src/models',
  'src/routes',
  'src/utils',
];

const files = {
  'package.json': `{\n  "name": "estatesync-backend",\n  "version": "1.0.0",\n  "description": "EstateSync Backend",\n  "main": "src/app.js",\n  "scripts": {\n    "start": "node src/app.js"\n  }\n}\n`,
  '.env': `# Environment Variables\nPORT=3000\nDATABASE_URL=\nREDIS_URL=\nJWT_SECRET=\n`,
  'src/app.js': `/**\n * Main application entry point.\n * Initializes Express, middleware, and routes.\n */\n`,
  'src/config/index.js': `/**\n * Configuration files (database, redis, env variables).\n */\n`,
  'src/utils/index.js': `/**\n * Utility functions and helpers.\n */\n`,
  
  // Controllers
  'src/controller/authController.js': `/**\n * Purpose: Login, logout, JWT, refresh token, user authentication\n * Strictly follows PRD constraints for roles and authentication.\n */\n`,
  'src/controller/walletController.js': `/**\n * Purpose: User wallet, available balance, wallet details\n * Enforces invariants: no negative balance, every allocation/expense recorded.\n */\n`,
  'src/controller/fundController.js': `/**\n * Purpose: Fund allocation and transfers\n * Ensures atomic transactions for Admin -> Manager and Manager -> User allocations.\n */\n`,
  'src/controller/fundRequestController.js': `/**\n * Purpose: Fund request workflow\n * Manages request states (PENDING, APPROVED, REJECTED) and insufficient funds escalation.\n */\n`,
  'src/controller/expenseController.js': `/**\n * Purpose: Expense lifecycle\n * Tracks expenses against wallets and ensures proper visibility (Role-based).\n */\n`,
  'src/controller/vendorController.js': `/**\n * Purpose: Vendor management\n */\n`,
  'src/controller/accountController.js': `/**\n * Purpose: Chart of Accounts\n */\n`,
  'src/controller/journalController.js': `/**\n * Purpose: Double-entry accounting\n * Ensures accounting integrity: debit = credit for every entry.\n */\n`,
  'src/controller/transactionController.js': `/**\n * Purpose: Complete transaction history\n * Maintains central authoritative ledger of all fund movements.\n */\n`,
  'src/controller/accountingPeriodController.js': `/**\n * Purpose: Accounting period locking\n */\n`,
  'src/controller/reconciliationController.js': `/**\n * Purpose: Bank/cash reconciliation\n */\n`,
  'src/controller/reportController.js': `/**\n * Purpose: Financial reports and dashboards\n * Distinguishes organizational funds, allocated funds, spent funds, and available funds.\n */\n`,
  
  // Middleware
  'src/middleware/authMiddleware.js': `/**\n * Middleware to verify JWT and authenticate users.\n */\n`,
  'src/middleware/permissionMiddleware.js': `/**\n * Middleware to enforce role-based access control (RBAC).\n * Example permissions: fund.view, fund.allocate, expense.create, etc.\n */\n`,
  'src/middleware/rateLimitMiddleware.js': `/**\n * Middleware for API rate limiting.\n */\n`,
  'src/middleware/errorMiddleware.js': `/**\n * Global error handling middleware.\n */\n`,
  
  // Models
  'src/models/User.js': `/**\n * User Model\n */\n`,
  'src/models/Role.js': `/**\n * Role Model (ADMIN, MANAGER, SALES, MARKETING, ACCOUNTING, OTHER)\n */\n`,
  'src/models/Permission.js': `/**\n * Permission Model\n */\n`,
  'src/models/Wallet.js': `/**\n * Wallet Model\n * Fields: wallet_id, user_id, total_allocated, total_spent, available_balance, etc.\n */\n`,
  'src/models/WalletTransaction.js': `/**\n * WalletTransaction Model\n * Types: FUND_ALLOCATION, EXPENSE, etc.\n */\n`,
  'src/models/FundRequest.js': `/**\n * FundRequest Model\n */\n`,
  'src/models/FundAllocation.js': `/**\n * FundAllocation Model\n */\n`,
  'src/models/Expense.js': `/**\n * Expense Model\n */\n`,
  'src/models/ExpenseCategory.js': `/**\n * ExpenseCategory Model\n */\n`,
  'src/models/Vendor.js': `/**\n * Vendor Model\n */\n`,
  'src/models/ChartOfAccount.js': `/**\n * ChartOfAccount Model\n */\n`,
  'src/models/JournalEntry.js': `/**\n * JournalEntry Model\n */\n`,
  'src/models/JournalLine.js': `/**\n * JournalLine Model\n */\n`,
  'src/models/AccountingPeriod.js': `/**\n * AccountingPeriod Model\n */\n`,
  'src/models/Reconciliation.js': `/**\n * Reconciliation Model\n */\n`,
  'src/models/AuditLog.js': `/**\n * AuditLog Model\n */\n`,
  
  // Routes
  'src/routes/authRoutes.js': `/**\n * Auth Routes (/api/v1/auth)\n */\n`,
  'src/routes/walletRoutes.js': `/**\n * Wallet Routes (/api/v1/wallets)\n */\n`,
  'src/routes/fundRoutes.js': `/**\n * Fund Routes (/api/v1/funds)\n */\n`,
  'src/routes/fundRequestRoutes.js': `/**\n * Fund Request Routes (/api/v1/fund-requests)\n */\n`,
  'src/routes/expenseRoutes.js': `/**\n * Expense Routes (/api/v1/expenses)\n */\n`,
  'src/routes/vendorRoutes.js': `/**\n * Vendor Routes (/api/v1/vendors)\n */\n`,
  'src/routes/accountRoutes.js': `/**\n * Account Routes (/api/v1/accounts)\n */\n`,
  'src/routes/journalRoutes.js': `/**\n * Journal Routes (/api/v1/journals)\n */\n`,
  'src/routes/transactionRoutes.js': `/**\n * Transaction Routes (/api/v1/transactions)\n */\n`,
  'src/routes/accountingPeriodRoutes.js': `/**\n * Accounting Period Routes (/api/v1/accounting-periods)\n */\n`,
  'src/routes/reconciliationRoutes.js': `/**\n * Reconciliation Routes (/api/v1/reconciliations)\n */\n`,
  'src/routes/reportRoutes.js': `/**\n * Report Routes (/api/v1/reports)\n */\n`
};

fs.mkdirSync(baseDir, { recursive: true });

dirs.forEach(dir => {
  fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
});

Object.entries(files).forEach(([filePath, content]) => {
  fs.writeFileSync(path.join(baseDir, filePath), content);
});

console.log('Structure created successfully.');
