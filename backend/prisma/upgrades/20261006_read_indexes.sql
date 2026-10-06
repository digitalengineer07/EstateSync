-- Run outside a transaction. CONCURRENTLY keeps existing writes available.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Customer_createdAt_id_idx" ON "Customer" ("createdAt" DESC, id DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Customer_salesOwnerId_createdAt_id_idx" ON "Customer" ("salesOwnerId", "createdAt" DESC, id DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "CustomerPayment_customerId_dateOfPayment_idx" ON "CustomerPayment" ("customerId", "dateOfPayment" DESC);
