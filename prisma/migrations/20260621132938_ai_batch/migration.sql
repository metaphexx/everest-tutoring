-- CreateTable
CREATE TABLE "AiBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerBatchId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'term-reports',
    "termId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "appliedCount" INTEGER NOT NULL DEFAULT 0,
    "mapping" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "AiBatch_providerBatchId_key" ON "AiBatch"("providerBatchId");

-- CreateIndex
CREATE INDEX "AiBatch_status_createdAt_idx" ON "AiBatch"("status", "createdAt");
