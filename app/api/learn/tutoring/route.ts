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
    throw new Error(
      `${provider} tutoring request failed with ${response.status}`,
    );
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
    const { submissionId, tutoringType } = body;

    if (!submissionId || !tutoringType) {
      return NextResponse.json(
        { error: "submissionId and tutoringType are required" },
        { status: 400 },
      );
    }

    // Get submission details
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        problem: true,
        user: true,
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
    }

    // Check if tutoring already exists
    const existingTutoring = await prisma.aiTutoring.findUnique({
      where: {
        submissionId_tutoringType: {
          submissionId,
          tutoringType,
        },
      },
    });

    if (existingTutoring) {
      return NextResponse.json(existingTutoring);
    }

    // Get user's AI config
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
          select: {
            provider: true,
            model: true,
            apiKey: true,
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

    // Build prompt based on tutoring type
    let prompt = "";
    const codeContext = `\`\`\`${submission.language.toLowerCase()}\n${submission.sourceCode}\n\`\`\``;

    if (tutoringType === "code_analysis") {
      prompt = `请分析以下提交的代码。题目是《${submission.problem?.title}》。\n\n${codeContext}\n\n提交状态：${submission.status}\n分数：${submission.score}\n\n请提供详细的代码分析，包括：\n1. 代码逻辑分析\n2. 可能存在的问题\n3. 代码质量评估`;
    } else if (tutoringType === "improvement_suggestion") {
      prompt = `请对以下代码提出改进建议。题目是《${submission.problem?.title}》。\n\n${codeContext}\n\n提交状态：${submission.status}\n分数：${submission.score}\n\n请提供改进建议，包括：\n1. 性能优化\n2. 代码风格改进\n3. 算法优化\n4. 边界情况处理`;
    } else if (tutoringType === "error_analysis") {
      prompt = `请分析以下提交代码的错误。题目是《${submission.problem?.title}》。\n\n${codeContext}\n\n提交状态：${submission.status}\n\n${submission.message ? `错误信息：${submission.message}` : ""}\n\n请提供错误分析，包括：\n1. 错误原因\n2. 如何修复\n3. 预防措施`;
    }

    const systemPrompt =
      "你是一个面向在线评测平台的 AI 学习助手。请用简洁、自然、专业的中文回答。支持 Markdown 和数学公式输出。";

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ];

    const tutoringContent = await callProviderChat({
      provider,
      apiKey,
      model,
      messages,
    });

    // Save tutoring record
    const tutoring = await prisma.aiTutoring.create({
      data: {
        userId,
        submissionId,
        problemId: submission.problemId,
        tutoringType,
        tutoringContent,
      },
    });

    // Increment user's AI tutoring count
    await prisma.user.update({
      where: { id: userId },
      data: {
        aiTutoringCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json(tutoring);
  } catch (error) {
    console.error("AI tutoring error:", error);
    return NextResponse.json(
      { error: "Failed to generate tutoring content" },
      { status: 500 },
    );
  }
}
