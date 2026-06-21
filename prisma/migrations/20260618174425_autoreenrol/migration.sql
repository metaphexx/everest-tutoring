-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "studentsCount" INTEGER NOT NULL DEFAULT 1,
    "subjectsPerWeek" INTEGER NOT NULL,
    "weeksRemaining" INTEGER NOT NULL,
    "totalAmountCents" INTEGER NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "confirmationCode" TEXT,
    "smsSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "autoReenrol" BOOLEAN NOT NULL DEFAULT true,
    "reenrolledToId" TEXT,
    "xeroContactId" TEXT,
    "xeroInvoiceId" TEXT,
    "xeroInvoiceNumber" TEXT,
    "xeroStatus" TEXT,
    "xeroSyncedAt" DATETIME,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("confirmationCode", "createdAt", "emailSent", "id", "notes", "paidAt", "paymentStatus", "smsSent", "stripePaymentId", "stripeSessionId", "studentsCount", "subjectsPerWeek", "termId", "totalAmountCents", "userId", "weeksRemaining", "xeroContactId", "xeroInvoiceId", "xeroInvoiceNumber", "xeroStatus", "xeroSyncedAt") SELECT "confirmationCode", "createdAt", "emailSent", "id", "notes", "paidAt", "paymentStatus", "smsSent", "stripePaymentId", "stripeSessionId", "studentsCount", "subjectsPerWeek", "termId", "totalAmountCents", "userId", "weeksRemaining", "xeroContactId", "xeroInvoiceId", "xeroInvoiceNumber", "xeroStatus", "xeroSyncedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_stripeSessionId_key" ON "Booking"("stripeSessionId");
CREATE UNIQUE INDEX "Booking_confirmationCode_key" ON "Booking"("confirmationCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
