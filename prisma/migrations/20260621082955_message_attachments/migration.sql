-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FileAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'upload',
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "originalName" TEXT,
    "uploadedById" TEXT,
    "messageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FileAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FileAttachment" ("createdAt", "id", "kind", "mimeType", "originalName", "sizeBytes", "uploadedById", "url") SELECT "createdAt", "id", "kind", "mimeType", "originalName", "sizeBytes", "uploadedById", "url" FROM "FileAttachment";
DROP TABLE "FileAttachment";
ALTER TABLE "new_FileAttachment" RENAME TO "FileAttachment";
CREATE INDEX "FileAttachment_uploadedById_createdAt_idx" ON "FileAttachment"("uploadedById", "createdAt");
CREATE INDEX "FileAttachment_messageId_idx" ON "FileAttachment"("messageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
