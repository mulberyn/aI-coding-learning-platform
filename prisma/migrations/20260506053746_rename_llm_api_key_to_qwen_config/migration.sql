/*
  Warnings:

  - You are about to drop the `LLMApiKey` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LLMApiKey";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "QwenConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QwenConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "QwenConfig_userId_idx" ON "QwenConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "QwenConfig_userId_provider_name_key" ON "QwenConfig"("userId", "provider", "name");
