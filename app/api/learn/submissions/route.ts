import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const problemId = searchParams.get("problemId");

  if (!problemId) {
    return NextResponse.json(
      { error: "Problem ID is required" },
      { status: 400 },
    );
  }

  // Get all submissions for this user and problem
  const submissions = await prisma.submission.findMany({
    where: {
      userId: session.user.id,
      problemId: problemId,
    },
    include: {
      judgeResults: {
        include: {
          testCase: true,
        },
      },
      aiTutorings: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(submissions);
}
