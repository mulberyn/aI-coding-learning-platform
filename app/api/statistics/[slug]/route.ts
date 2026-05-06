import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const problem = await prisma.problem.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { submissions: true },
        },
        submissions: {
          include: {
            user: true,
            judgeResults: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    // 计算统计数据
    const totalSubmissions = problem._count.submissions;
    const totalAccepted = problem.submissions.filter(
      (s) => s.status === "ACCEPTED",
    ).length;
    const acceptanceRate =
      totalSubmissions > 0
        ? Math.round((totalAccepted / totalSubmissions) * 100)
        : 0;

    // 统计分布
    const submissionStats = {
      accepted: problem.submissions.filter((s) => s.status === "ACCEPTED")
        .length,
      wrongAnswer: problem.submissions.filter(
        (s) => s.status === "WRONG_ANSWER",
      ).length,
      runtimeError: problem.submissions.filter(
        (s) => s.status === "RUNTIME_ERROR",
      ).length,
      timeoutError: problem.submissions.filter(
        (s) => s.status === "TIME_LIMIT_EXCEEDED",
      ).length,
      compileError: problem.submissions.filter(
        (s) => s.status === "COMPILE_ERROR",
      ).length,
    };

    // 格式化提交数据
    const submissions = problem.submissions.map((submission) => ({
      id: submission.id,
      userId: submission.userId,
      userName: submission.user.name,
      language: submission.language,
      score: submission.score,
      runtime:
        submission.judgeResults.length > 0
          ? Math.round(
              (submission.judgeResults.reduce(
                (sum, jr) => sum + (jr.timeSec || 0),
                0,
              ) /
                submission.judgeResults.length) *
                1000,
            )
          : undefined,
      memory:
        submission.judgeResults.length > 0
          ? Math.round(
              submission.judgeResults.reduce(
                (sum, jr) => sum + (jr.memoryKb || 0),
                0,
              ) /
                submission.judgeResults.length /
                1024,
            )
          : undefined,
      codeLength: submission.sourceCode.length,
      createdAt: submission.createdAt,
    }));

    return NextResponse.json({
      totalSubmissions,
      totalAccepted,
      acceptanceRate,
      submissions,
      submissionStats,
    });
  } catch (error) {
    console.error("Failed to fetch statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 },
    );
  }
}
