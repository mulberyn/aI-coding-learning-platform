import { Difficulty, ProblemType, SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const difficultyLabel: Record<Difficulty, string> = {
  EASY: "简单",
  MEDIUM: "普通",
  HARD: "困难",
};

export const problemTypeLabel: Record<ProblemType, string> = {
  FUNCTIONAL: "函数式题目（LeetCode 风格）",
  TRADITIONAL: "传统输入输出题（Codeforces 风格）",
};

export async function getPartitionedProblems() {
  const rows = await prisma.problem.findMany({
    orderBy: [{ type: "asc" }, { difficulty: "asc" }, { createdAt: "asc" }],
  });

  return {
    functional: rows.filter(
      (problem) => problem.type === ProblemType.FUNCTIONAL,
    ),
    traditional: rows.filter(
      (problem) => problem.type === ProblemType.TRADITIONAL,
    ),
  };
}

export async function getProblemCatalog() {
  return prisma.problem.findMany({
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      statement: true,
      topic: true,
      source: true,
      difficulty: true,
      type: true,
      acceptanceRate: true,
    },
  });
}

export type UserProblemAttemptState = "UNTRIED" | "ATTEMPTED" | "SOLVED";

export async function getUserProblemAttemptMap(userId?: string | null) {
  if (!userId) {
    return {} as Record<string, UserProblemAttemptState>;
  }

  const submissions = await prisma.submission.findMany({
    where: { userId },
    select: {
      problemId: true,
      status: true,
    },
  });

  const attemptMap: Record<string, UserProblemAttemptState> = {};

  for (const submission of submissions) {
    const current = attemptMap[submission.problemId] ?? "UNTRIED";

    if (submission.status === SubmissionStatus.ACCEPTED) {
      attemptMap[submission.problemId] = "SOLVED";
      continue;
    }

    if (current !== "SOLVED") {
      attemptMap[submission.problemId] = "ATTEMPTED";
    }
  }

  return attemptMap;
}

export async function getProblemBySlug(slug: string) {
  return prisma.problem.findUnique({
    where: { slug },
    select: {
      id: true,
      problemNumber: true,
      slug: true,
      title: true,
      statement: true,
      topic: true,
      source: true,
      difficulty: true,
      type: true,
      acceptanceRate: true,
      functionName: true,
      functionSignature: true,
      traditionalInputFormat: true,
      traditionalOutputFormat: true,
      timeLimitMs: true,
      memoryLimitMb: true,
      _count: {
        select: {
          submissions: true,
        },
      },
      examples: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}
