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
      temperature: 0.2,
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
    const contentForNaming = String(body?.text ?? "");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        aiProvider: true,
        aiModel: true,
        aiApiKey: true,
        apiKeyConfigs: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { provider: true, model: true, apiKey: true },
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
      "你是一个简洁的中文命名助手。请为下列对话或文本生成一个简短、明晰的对话名，最好不超过 18 个字符，直接返回名称。不要带额外标点或说明。";

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `请为如下内容生成对话名称：\n\n${contentForNaming}`,
      },
    ];

    const title = await callProviderChat({ provider, apiKey, model, messages });

    return NextResponse.json({ title: title.slice(0, 80) });
  } catch (error) {
    console.error("Generate name failed:", error);
    return NextResponse.json({ error: "生成名称失败" }, { status: 500 });
  }
}
