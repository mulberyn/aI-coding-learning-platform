import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";

function normalizeMessage(message: unknown) {
  if (!message || typeof message !== "object") {
    return null;
  }

  const value = message as {
    role?: string;
    content?: unknown;
    promptText?: unknown;
    attachments?: unknown;
  };

  if (
    value.role !== "user" &&
    value.role !== "assistant" &&
    value.role !== "system"
  ) {
    return null;
  }

  if (typeof value.content !== "string") {
    return null;
  }

  return {
    role: value.role,
    content: value.content,
    promptText: typeof value.promptText === "string" ? value.promptText : null,
    attachments: Array.isArray(value.attachments)
      ? value.attachments
          .filter((attachment) => attachment && typeof attachment === "object")
          .map((attachment) => {
            const item = attachment as {
              id?: unknown;
              type?: unknown;
              title?: unknown;
              content?: unknown;
            };

            return {
              id: typeof item.id === "string" ? item.id : "",
              type:
                item.type === "selection" || item.type === "preset"
                  ? item.type
                  : "preset",
              title: typeof item.title === "string" ? item.title : "",
              content: typeof item.content === "string" ? item.content : "",
            };
          })
      : [],
  };
}

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

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureConversationTable();

  const list = await prisma.$queryRaw<
    Array<{
      id: string;
      userId: string;
      title: string;
      messages: string;
      createdAt: string;
      updatedAt: string;
    }>
  >(Prisma.sql`
    SELECT id, userId, title, messages, createdAt, updatedAt
    FROM AiConversation
    WHERE userId = ${userId}
    ORDER BY createdAt DESC
    LIMIT 200
  `);

  return NextResponse.json({
    items: list.map((item) => ({
      ...item,
      messages: (() => {
        try {
          return JSON.parse(item.messages);
        } catch {
          return [];
        }
      })(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureConversationTable();

    const body = await request.json();
    const id = String(body?.id ?? randomUUID());
    const title = String(body?.title ?? "未命名对话");
    const messages = Array.isArray(body?.messages)
      ? body.messages.map(normalizeMessage).filter(Boolean)
      : [];

    const serializedMessages = JSON.stringify(messages);

    // Try to update existing conversation first
    const updateResult = await prisma.$executeRaw(
      Prisma.sql`
        UPDATE AiConversation
        SET title = ${title}, messages = ${serializedMessages}, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ${id} AND userId = ${userId}
      `,
    );

    // If no rows were updated, create a new one
    if (!updateResult) {
      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO AiConversation (id, userId, title, messages, createdAt, updatedAt)
          VALUES (${id}, ${userId}, ${title}, ${serializedMessages}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
      );
    }

    const record = {
      id,
      userId,
      title,
      messages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ item: record });
  } catch (error) {
    console.error("Save conversation failed:", error);
    return NextResponse.json({ error: "保存对话失败" }, { status: 500 });
  }
}
