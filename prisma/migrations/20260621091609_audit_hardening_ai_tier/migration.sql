-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "hash" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "ip" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "prevHash" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "userAgent" TEXT;

-- AlterTable
ALTER TABLE "Referral" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "StudentCredit" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "StudentNote" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "TutorResource" ADD COLUMN "deletedAt" DATETIME;

-- CreateTable
CREATE TABLE "SearchDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "embedding" TEXT,
    "model" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AiCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "task" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costCents" REAL NOT NULL DEFAULT 0,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Digest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'morning',
    "body" TEXT NOT NULL,
    "live" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SearchDocument_entity_idx" ON "SearchDocument"("entity");

-- CreateIndex
CREATE UNIQUE INDEX "SearchDocument_entity_entityId_key" ON "SearchDocument"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "AiCache_key_key" ON "AiCache"("key");

-- CreateIndex
CREATE INDEX "AiCache_task_createdAt_idx" ON "AiCache"("task", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_task_createdAt_idx" ON "AiUsage"("task", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");

-- CreateIndex
CREATE INDEX "Digest_kind_createdAt_idx" ON "Digest"("kind", "createdAt");
