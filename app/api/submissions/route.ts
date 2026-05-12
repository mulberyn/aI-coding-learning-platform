import { NextResponse } from "next/server";
import { z } from "zod";
import { SubmissionLanguage } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runSubmissionJudging } from "@/lib/judge0";

const createSubmissionSchema = z.object({
  problemSlug: z.string().min(1),
  language: z.nativeEnum(SubmissionLanguage),
  sourceCode: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid submission payload" },
        { status: 400 },
      );
    }

    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 401 },
      );
    }

    const problem = await prisma.problem.findUnique({
      where: { slug: parsed.data.problemSlug },
      include: {
        testCases: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    if (problem.testCases.length === 0) {
      return NextResponse.json(
        { error: "Problem has no test cases configured" },
        { status: 400 },
      );
    }

    const submission = await prisma.submission.create({
      data: {
        userId: session.user.id,
        problemId: problem.id,
        language: parsed.data.language,
        sourceCode: parsed.data.sourceCode,
        judgeResults: {
          create: problem.testCases.map((testCase) => ({
            testCaseId: testCase.id,
          })),
        },
      },
    });

    void runSubmissionJudging(submission.id);

    return NextResponse.json({
      submissionId: submission.id,
      status: submission.status,
    });
  } catch (error) {
    console.error("Submission error:", error);

    // 确保返回 JSON 格式的错误
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Submission failed: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Submission failed: Unknown error" },
      { status: 500 },
    );
  }
}
