-- AlterTable
ALTER TABLE "User" ADD COLUMN "qwenApiKeyId" TEXT;

-- CreateTable
CREATE TABLE "LLMApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LLMApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LLMApiKey_userId_idx" ON "LLMApiKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LLMApiKey_userId_provider_name_key" ON "LLMApiKey"("userId", "provider", "name");
