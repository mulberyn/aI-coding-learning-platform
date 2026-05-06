-- AlterTable
ALTER TABLE "Contest" ADD COLUMN "announcement" TEXT;

-- CreateTable
CREATE TABLE "ContestProblem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contestId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "fullScore" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContestProblem_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContestRanking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contestId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "penalty" INTEGER NOT NULL DEFAULT 0,
    "details" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContestRanking_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContestProblem_contestId_idx" ON "ContestProblem"("contestId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestProblem_contestId_number_key" ON "ContestProblem"("contestId", "number");

-- CreateIndex
CREATE INDEX "ContestRanking_contestId_idx" ON "ContestRanking"("contestId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestRanking_contestId_rank_key" ON "ContestRanking"("contestId", "rank");
