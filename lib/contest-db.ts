import { prisma } from "@/lib/prisma";

export interface ContestDetail {
  id: string;
  title: string;
  description: string | null;
  type: string;
  format: string;
  status: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  participantCount: number;
  announcement: string | null;
  problems: Array<{
    id: string;
    number: number;
    fullScore: number;
    problemId: string;
    title?: string; // Will be added from Problem lookup if needed
  }>;
  ranking: Array<{
    id: string;
    rank: number;
    userId: string;
    username: string;
    totalScore: number;
    penalty: number;
    submissionDetails: any[];
  }>;
}

export async function getContestDetailFromDb(
  contestId: string,
): Promise<ContestDetail | null> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      problems: {
        orderBy: { number: "asc" },
      },
      rankings: {
        orderBy: { rank: "asc" },
      },
    },
  });

  if (!contest) return null;

  return {
    id: contest.id,
    title: contest.title,
    description: contest.description,
    type: contest.type,
    format: contest.format,
    status: contest.status,
    startTime: contest.startTime,
    endTime: contest.endTime,
    duration: contest.duration,
    participantCount: contest.participantCount,
    announcement: contest.announcement,
    problems: contest.problems.map((p) => ({
      id: p.id,
      number: p.number,
      fullScore: p.fullScore,
      problemId: p.problemId,
    })),
    ranking: contest.rankings.map((r) => ({
      id: r.id,
      rank: r.rank,
      userId: r.userId,
      username: r.username,
      totalScore: r.totalScore,
      penalty: r.penalty,
      submissionDetails: JSON.parse(r.details),
    })),
  };
}
