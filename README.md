# EstateSync

EstateSync is a comprehensive, role-based Fund Management & Accounting System. It is designed to manage organizational funds, employee/team wallets, expense requests, approvals, allocations, and full financial transactional auditing. 

The system operates with strict Role-Based Access Control (RBAC) and immutable PostgreSQL transactional logic to ensure that every rupee moved within the organization is tracked and that wallet balances never go negative.

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JSON Web Tokens (JWT) + bcrypt

## Core Features

- **Hierarchical Wallets:** Real-time wallet tracking for Admins, Managers, and Employees.
- **Strict Atomic Transactions:** Funds are transferred safely using Prisma `$transaction` blocks to prevent race conditions.
- **Fund Requests:** Employees can request funds from managers; managers can request from Admins.
- **Expense Tracking:** Users can upload categorized expenses which automatically deduct from their wallet balances.
- **Real-Time Dashboards:** Dynamic statistical aggregation to show organizational cash, manager budgets, and employee spends.
- **Immutable Ledger:** Every fund movement is recorded in a central `WalletTransaction` ledger.

---

## Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL (Local or Cloud URL)

### 1. Database Configuration
1. Navigate to the `backend` directory.
2. Create a `.env` file (if not already present).
3. Set your PostgreSQL database connection string and JWT secrets:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/estatesync?schema=public"
   JWT_SECRET="your_jwt_secret_here"
   JWT_REFRESH_SECRET="your_refresh_secret_here"
   PORT=4000
   ```

### 2. Backend Setup
Open a terminal and run the following commands:
```bash
cd backend
npm install
```

**Initialize the Database:**
Push the Prisma schema to your database to create the tables:
```bash
npx prisma db push
```

**Seed the Database:**
Run the seeder script. This will create the required roles, permissions, categories, and dummy users (along with their wallets).
```bash
node prisma/seed.js
```

*The seeder creates 6 test users. They all use the password `password123`.*
- `admin@estatesync.local`
- `manager@estatesync.local`
- `sales@estatesync.local`
- `marketing@estatesync.local`
- `accounting@estatesync.local`
- `other@estatesync.local`

**Start the Backend Server:**
```bash
npm run dev
```
The API will be available at `http://localhost:4000`.

### 3. Frontend Setup
Open a new terminal and run the following commands:
```bash
cd frontend
npm install
npm run dev
```
The web application will be available at `http://localhost:3000`.

---

## Project Structure

- `backend/prisma/schema.prisma` - The core database schema and relationships.
- `backend/src/controller/` - Business logic for expenses, wallets, fund requests, and live dashboard stats.
- `frontend/src/app/dashboards/` - Next.js page routes for the role-specific dashboards.
- `frontend/src/components/` - Reusable React components (Forms, Tables, Stats).
- `prd.md` - The Product Requirements Document defining the exact behavior of the system.
- `complete.md` - The current feature completion tracking matrix.

## Troubleshooting

- **Token Expired Error on Frontend:** JWT tokens currently expire after 24 hours. Simply click "Logout" in the sidebar and log back in to refresh your token.
- **Prisma Schema Changes:** If you modify `schema.prisma`, run `npx prisma db push` to sync the changes to your database.
