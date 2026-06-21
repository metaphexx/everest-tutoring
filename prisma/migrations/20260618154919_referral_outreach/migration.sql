-- AlterTable
ALTER TABLE "Referral" ADD COLUMN "outreachEmail" TEXT;
ALTER TABLE "Referral" ADD COLUMN "outreachSentAt" DATETIME;
ALTER TABLE "Referral" ADD COLUMN "outreachSms" TEXT;
ALTER TABLE "Referral" ADD COLUMN "outreachStatus" TEXT;
ALTER TABLE "Referral" ADD COLUMN "outreachSubject" TEXT;
ALTER TABLE "Referral" ADD COLUMN "parentEmail" TEXT;
ALTER TABLE "Referral" ADD COLUMN "parentName" TEXT;
ALTER TABLE "Referral" ADD COLUMN "parentPhone" TEXT;
