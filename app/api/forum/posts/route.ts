import { ForumBoard } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const createPostSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1),
  board: z.nativeEnum(ForumBoard),
  problemNumber: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createPostSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid post payload" },
      { status: 400 },
    );
  }

  const { title, content, board, problemNumber } = parsed.data;

  let problemId: string | undefined;
  if (problemNumber) {
    const problem = await prisma.problem.findFirst({
      where: { problemNumber },
      select: { id: true },
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    problemId = problem.id;
  }

  const post = await prisma.forumPost.create({
    data: {
      title,
      content,
      board,
      userId: session.user.id,
      problemId,
    },
    select: { id: true },
  });

  return NextResponse.json({ postId: post.id }, { status: 201 });
}
