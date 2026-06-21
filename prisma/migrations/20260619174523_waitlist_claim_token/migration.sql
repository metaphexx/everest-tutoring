-- AlterTable: one-click claim link token for waitlist seat offers
ALTER TABLE "Waitlist" ADD COLUMN "claimToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Waitlist_claimToken_key" ON "Waitlist"("claimToken");
