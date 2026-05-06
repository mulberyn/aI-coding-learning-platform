/*
  Warnings:

  - You are about to drop the `QwenConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `qwenApiKeyId` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "QwenConfig_userId_provider_name_key";

-- DropIndex
DROP INDEX "QwenConfig_userId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "QwenConfig";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "LLMConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LLMConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "passwordHash" TEXT NOT NULL,
    "aiProvider" TEXT NOT NULL DEFAULT 'deepseek',
    "aiModel" TEXT NOT NULL DEFAULT 'deepseek-chat',
    "aiApiKey" TEXT,
    "aiWeeklySummary" TEXT,
    "aiWeeklySummaryUpdatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("aiApiKey", "aiModel", "aiProvider", "aiWeeklySummary", "aiWeeklySummaryUpdatedAt", "createdAt", "email", "id", "name", "passwordHash", "role", "updatedAt") SELECT "aiApiKey", "aiModel", "aiProvider", "aiWeeklySummary", "aiWeeklySummaryUpdatedAt", "createdAt", "email", "id", "name", "passwordHash", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LLMConfig_userId_idx" ON "LLMConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LLMConfig_userId_provider_name_key" ON "LLMConfig"("userId", "provider", "name");
