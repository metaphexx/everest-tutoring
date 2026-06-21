-- CreateTable
CREATE TABLE "PendingBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "parentFirstName" TEXT,
    "parentLastName" TEXT,
    "payload" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "resumeToken" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'started',
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingBooking_email_key" ON "PendingBooking"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PendingBooking_resumeToken_key" ON "PendingBooking"("resumeToken");

-- CreateIndex
CREATE INDEX "PendingBooking_status_updatedAt_idx" ON "PendingBooking"("status", "updatedAt");
