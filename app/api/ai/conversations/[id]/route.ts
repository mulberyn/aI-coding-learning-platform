import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

async function ensureConversationTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS AiConversation (
      id TEXT NOT NULL PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      messages TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS AiConversation_userId_createdAt_idx
    ON AiConversation(userId, createdAt)
  `);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureConversationTable();
    const { id } = await params;

    // Verify the conversation belongs to this user
    const conversation = await prisma.$queryRaw<
      Array<{ userId: string }>
    >(Prisma.sql`
      SELECT userId FROM AiConversation WHERE id = ${id}
    `);

    if (!conversation || conversation.length === 0) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (conversation[0].userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the conversation
    await prisma.$executeRaw(
      Prisma.sql`
        DELETE FROM AiConversation WHERE id = ${id} AND userId = ${userId}
      `,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete conversation failed:", error);
    return NextResponse.json({ error: "删除对话失败" }, { status: 500 });
  }
}
