import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const createCommentSchema = z.object({
  content: z.string().trim().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const post = await prisma.forumPost.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createCommentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid comment payload" },
      { status: 400 },
    );
  }

  const comment = await prisma.forumComment.create({
    data: {
      content: parsed.data.content,
      postId: id,
      userId: session.user.id,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: {
        select: { name: true },
      },
    },
  });

  return NextResponse.json(
    {
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        userName: comment.user.name,
      },
    },
    { status: 201 },
  );
}
