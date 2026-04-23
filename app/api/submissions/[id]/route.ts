import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      judgeResults: {
        orderBy: {
          testCase: {
            sortOrder: "asc",
          },
        },
        include: {
          testCase: {
            select: {
              id: true,
              sortOrder: true,
              isSample: true,
            },
          },
        },
      },
      problem: {
        select: {
          slug: true,
          title: true,
        },
      },
      user: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!submission) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 },
    );
  }

  const isOwner = submission.user.id === session.user.id;
  const canViewAny =
    session.user.role === "ADMIN" || session.user.role === "TEACHER";

  if (!isOwner && !canViewAny) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: submission.id,
    status: submission.status,
    score: submission.score,
    message: submission.message,
    language: submission.language,
    sourceCode: submission.sourceCode,
    startedAt: submission.startedAt,
    finishedAt: submission.finishedAt,
    createdAt: submission.createdAt,
    problem: submission.problem,
    judgeResults: submission.judgeResults.map((result) => ({
      id: result.id,
      status: result.status,
      judge0StatusId: result.judge0StatusId,
      stdout: result.stdout,
      stderr: result.stderr,
      compileOutput: result.compileOutput,
      timeSec: result.timeSec,
      memoryKb: result.memoryKb,
      testCase: result.testCase,
    })),
  });
}
