-- CreateTable
CREATE TABLE "ForumPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "board" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ForumPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ForumPost_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ForumComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ForumComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ForumComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ForumPost_board_createdAt_idx" ON "ForumPost"("board", "createdAt");

-- CreateIndex
CREATE INDEX "ForumPost_problemId_createdAt_idx" ON "ForumPost"("problemId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumPost_isPinned_createdAt_idx" ON "ForumPost"("isPinned", "createdAt");

-- CreateIndex
CREATE INDEX "ForumPost_userId_createdAt_idx" ON "ForumPost"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumComment_postId_createdAt_idx" ON "ForumComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumComment_userId_createdAt_idx" ON "ForumComment"("userId", "createdAt");
