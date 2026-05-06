/*
  Warnings:

  - You are about to drop the `LLMConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LLMConfig";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ApiKeyConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApiKeyConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ApiKeyConfig_userId_idx" ON "ApiKeyConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKeyConfig_userId_provider_name_key" ON "ApiKeyConfig"("userId", "provider", "name");
