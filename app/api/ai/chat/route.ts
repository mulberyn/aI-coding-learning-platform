import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const QWEN_API_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function getProviderEndpoint(provider: string) {
  if (provider === "qwen") {
    return QWEN_API_URL;
  }

  return DEEPSEEK_API_URL;
}

async function callProviderChat(params: {
  provider: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
}) {
  const { provider, apiKey, model, messages } = params;
  const endpoint = getProviderEndpoint(provider);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.45,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`${provider} chat request failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error(`${provider} response did not contain content`);
  }

  return content;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const incomingMessages = Array.isArray(body?.messages) ? body.messages : [];

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        aiProvider: true,
        aiModel: true,
        aiApiKey: true,
        apiKeyConfigs: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            provider: true,
            model: true,
            apiKey: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const selectedConfig = user.apiKeyConfigs[0];
    const provider = (
      selectedConfig?.provider ??
      user.aiProvider ??
      "deepseek"
    ).toLowerCase();
    const model = selectedConfig?.model ?? user.aiModel ?? "deepseek-chat";
    const apiKey = selectedConfig?.apiKey ?? user.aiApiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: "请先在设置中配置并选中 API Key" },
        { status: 400 },
      );
    }

    const systemPrompt =
      "你是一个面向在线评测平台的 AI 学习助手。请用简洁、自然、专业的中文回答，优先结合用户提供的上下文、题目与学习目标。支持 Markdown 和数学公式输出。";

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...incomingMessages
        .filter((message: unknown): message is ChatMessage =>
          Boolean(
            message &&
            typeof message === "object" &&
            typeof (message as ChatMessage).content === "string" &&
            ((message as ChatMessage).role === "user" ||
              (message as ChatMessage).role === "assistant"),
          ),
        )
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    ];

    const content = await callProviderChat({
      provider,
      apiKey,
      model,
      messages,
    });

    return NextResponse.json({
      content,
      provider,
      model,
      configName: selectedConfig?.name ?? null,
    });
  } catch (error) {
    console.error("AI chat request failed:", error);
    return NextResponse.json(
      { error: "AI 请求失败，请检查 API Key 或模型配置" },
      { status: 500 },
    );
  }
}
