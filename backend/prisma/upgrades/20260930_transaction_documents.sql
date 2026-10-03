-- CreateTable
CREATE TABLE "TransactionDocument" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "rootDocumentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "replacesDocumentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "archivedBy" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archiveReason" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentUpload" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "discardedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentException" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewReason" TEXT,

    CONSTRAINT "DocumentException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransactionDocument_storageKey_key" ON "TransactionDocument"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionDocument_replacesDocumentId_key" ON "TransactionDocument"("replacesDocumentId");

-- CreateIndex
CREATE INDEX "TransactionDocument_sourceType_sourceId_idx" ON "TransactionDocument"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "TransactionDocument_status_uploadedAt_idx" ON "TransactionDocument"("status", "uploadedAt");

-- CreateIndex
CREATE INDEX "TransactionDocument_documentType_uploadedAt_idx" ON "TransactionDocument"("documentType", "uploadedAt");

-- CreateIndex
CREATE INDEX "TransactionDocument_sha256_idx" ON "TransactionDocument"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionDocument_rootDocumentId_version_key" ON "TransactionDocument"("rootDocumentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentUpload_storageKey_key" ON "DocumentUpload"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentUpload_documentId_key" ON "DocumentUpload"("documentId");

-- CreateIndex
CREATE INDEX "DocumentUpload_expiresAt_idx" ON "DocumentUpload"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentUpload_uploadedBy_idempotencyKey_key" ON "DocumentUpload"("uploadedBy", "idempotencyKey");

-- CreateIndex
CREATE INDEX "DocumentException_status_requestedAt_idx" ON "DocumentException"("status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentException_sourceType_sourceId_key" ON "DocumentException"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "TransactionDocument" ADD CONSTRAINT "TransactionDocument_replacesDocumentId_fkey" FOREIGN KEY ("replacesDocumentId") REFERENCES "TransactionDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionDocument" ADD CONSTRAINT "TransactionDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentUpload" ADD CONSTRAINT "DocumentUpload_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentUpload" ADD CONSTRAINT "DocumentUpload_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "TransactionDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


