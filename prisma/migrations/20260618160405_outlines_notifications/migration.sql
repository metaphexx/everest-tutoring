-- CreateTable
CREATE TABLE "CourseOutline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yearLevel" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "termId" TEXT,
    "fileName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "rawText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "topics" TEXT,
    "scanSummary" TEXT,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedAt" DATETIME,
    CONSTRAINT "CourseOutline_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "refKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "CourseOutline_yearLevel_subject_idx" ON "CourseOutline"("yearLevel", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "AdminNotification_refKey_key" ON "AdminNotification"("refKey");

-- CreateIndex
CREATE INDEX "AdminNotification_read_createdAt_idx" ON "AdminNotification"("read", "createdAt");
