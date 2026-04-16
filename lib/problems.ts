import { Difficulty, ProblemType } from "@prisma/client";
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

export async function getProblemBySlug(slug: string) {
  return prisma.problem.findUnique({
    where: { slug },
    include: {
      examples: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}
