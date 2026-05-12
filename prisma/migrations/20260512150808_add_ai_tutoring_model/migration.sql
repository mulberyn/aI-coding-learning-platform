-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiTutoring" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "tutoringType" TEXT NOT NULL,
    "tutoringContent" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiTutoring_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiTutoring_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiTutoring_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "aiRecommendations" TEXT,
    "aiRecommendationsUpdatedAt" DATETIME,
    "aiTutoringCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("aiApiKey", "aiModel", "aiProvider", "aiRecommendations", "aiRecommendationsUpdatedAt", "aiWeeklySummary", "aiWeeklySummaryUpdatedAt", "createdAt", "email", "id", "name", "passwordHash", "role", "updatedAt") SELECT "aiApiKey", "aiModel", "aiProvider", "aiRecommendations", "aiRecommendationsUpdatedAt", "aiWeeklySummary", "aiWeeklySummaryUpdatedAt", "createdAt", "email", "id", "name", "passwordHash", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AiConversation_userId_createdAt_idx" ON "AiConversation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiTutoring_userId_createdAt_idx" ON "AiTutoring"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiTutoring_submissionId_idx" ON "AiTutoring"("submissionId");

-- CreateIndex
CREATE INDEX "AiTutoring_problemId_idx" ON "AiTutoring"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "AiTutoring_submissionId_tutoringType_key" ON "AiTutoring"("submissionId", "tutoringType");
