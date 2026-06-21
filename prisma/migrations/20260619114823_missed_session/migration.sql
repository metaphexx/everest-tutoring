-- CreateTable
CREATE TABLE "MissedSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "missedSubject" TEXT NOT NULL,
    "missedDateLabel" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "makeupSubject" TEXT,
    "makeupDateLabel" TEXT,
    "creditId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "MissedSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MissedSession_parentId_status_idx" ON "MissedSession"("parentId", "status");

-- CreateIndex
CREATE INDEX "MissedSession_termId_status_idx" ON "MissedSession"("termId", "status");
