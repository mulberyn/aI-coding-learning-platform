import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";

type NormalizedAttachment = {
  id: string;
  type: "selection" | "preset";
  title: string;
  content: string;
};

type NormalizedConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  promptText: string | null;
  attachments: NormalizedAttachment[];
};

function parseMessageContent(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const objectValue = value as {
      text?: unknown;
      content?: unknown;
      value?: unknown;
    };

    if (typeof objectValue.text === "string") {
      return objectValue.text;
    }

    if (typeof objectValue.content === "string") {
      return objectValue.content;
    }

    if (typeof objectValue.value === "string") {
      return objectValue.value;
    }
  }

  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (!part || typeof part !== "object") {
          return "";
        }

        const item = part as {
          type?: unknown;
          text?: unknown;
          content?: unknown;
        };

        if (item.type === "text" && typeof item.text === "string") {
          return item.text;
        }

        if (typeof item.text === "string") {
          return item.text;
        }

        if (typeof item.content === "string") {
          return item.content;
        }

        return "";
      })
      .filter((part) => part.length > 0)
      .join("\n");
  }

  return "";
}

function normalizeRole(value: unknown): "user" | "assistant" | "system" | null {
  if (typeof value !== "string") {
    return null;
  }

  const role = value.trim().toLowerCase();
  if (role === "user" || role === "assistant" || role === "system") {
    return role;
  }

  if (role === "human") {
    return "user";
  }

  if (role === "ai" || role === "bot") {
    return "assistant";
  }

  return null;
}

function normalizeMessage(message: unknown) {
  if (!message || typeof message !== "object") {
    return null;
  }

  const value = message as {
    role?: string;
    content?: unknown;
    text?: unknown;
    parts?: unknown;
    promptText?: unknown;
    attachments?: unknown;
  };

  const role = normalizeRole(value.role);
  if (!role) {
    return null;
  }

  const content = parseMessageContent(
    value.content ?? value.text ?? value.parts,
  );
  const promptText =
    typeof value.promptText === "string" ? value.promptText : null;
  const finalContent = content.trim().length > 0 ? content : (promptText ?? "");

  if (finalContent.trim().length === 0) {
    return null;
  }

  return {
    role,
    content: finalContent,
    promptText,
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

function normalizeConversationMessages(
  rawMessages: unknown,
): NormalizedConversationMessage[] {
  if (Array.isArray(rawMessages)) {
    return rawMessages.map(normalizeMessage).filter(Boolean);
  }

  if (rawMessages && typeof rawMessages === "object") {
    const wrapped = rawMessages as { messages?: unknown };
    if (Array.isArray(wrapped.messages)) {
      return wrapped.messages.map(normalizeMessage).filter(Boolean);
    }
  }

  return [];
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
          const parsed = JSON.parse(item.messages) as unknown;
          return normalizeConversationMessages(parsed);
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
    const messages = normalizeConversationMessages(body?.messages);

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
