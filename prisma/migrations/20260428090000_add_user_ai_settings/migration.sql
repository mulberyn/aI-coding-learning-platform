ALTER TABLE "User" ADD COLUMN "aiProvider" TEXT NOT NULL DEFAULT 'deepseek';
ALTER TABLE "User" ADD COLUMN "aiModel" TEXT NOT NULL DEFAULT 'deepseek-chat';
ALTER TABLE "User" ADD COLUMN "aiApiKey" TEXT;
ALTER TABLE "User" ADD COLUMN "aiWeeklySummary" TEXT;
ALTER TABLE "User" ADD COLUMN "aiWeeklySummaryUpdatedAt" DATETIME;
