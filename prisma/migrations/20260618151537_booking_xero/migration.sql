-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "xeroContactId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "xeroInvoiceId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "xeroInvoiceNumber" TEXT;
ALTER TABLE "Booking" ADD COLUMN "xeroStatus" TEXT;
ALTER TABLE "Booking" ADD COLUMN "xeroSyncedAt" DATETIME;
