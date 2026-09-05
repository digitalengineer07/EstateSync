# Database Schema Integrity Rules

## 1. Single Source of Truth
- `backend/prisma/schema.prisma` is the **ONLY** source of truth for the entire database.
- **NEVER** add tables or columns solely through raw SQL scripts, manual console commands, or ad-hoc migrations without immediately declaring them in `schema.prisma`.

## 2. Standard Protocol For Adding / Modifying Database Features
Whenever any new feature requires database changes:
1. **Update `backend/prisma/schema.prisma` first**:
   - Define the new model or add the new fields with correct scalar types and default values.
2. **Apply to Database**:
   - Run `npx prisma db push` (or `npx prisma migrate dev`).
3. **Regenerate Prisma Client**:
   - Run `npx prisma generate`.
4. **Verify Integrity**:
   - Run `npm run audit:db` in `backend/` to ensure all models and scalar columns exist in PostgreSQL.

## 3. Database Switching / New Environment Setup
When connecting to a new database (e.g. testing database, new branch, or production):
1. Update `DATABASE_URL` in `backend/.env`.
2. Run `npx prisma db push`.
3. Run `npm run audit:db` to confirm 100% parity across all 40+ tables and columns.
4. If seed data or initial roles are needed, run the verified seed script.
