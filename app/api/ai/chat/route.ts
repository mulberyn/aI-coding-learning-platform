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

type SubmissionSummary = {
  createdAt: Date;
  status: string;
  score: number;
  problem: {
    title: string;
    topic: string;
    difficulty: string;
    slug: string;
  };
};

function formatPercentage(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function buildLearningBackground(params: {
  name: string;
  aiWeeklySummary: string | null;
  submissions: SubmissionSummary[];
}) {
  const { name, aiWeeklySummary, submissions } = params;
  const totalSubmissions = submissions.length;
  const acceptedSubmissions = submissions.filter(
    (submission) => submission.status === "ACCEPTED",
  ).length;
  const acceptedRate =
    totalSubmissions > 0 ? acceptedSubmissions / totalSubmissions : 0;
  const now = Date.now();
  const last7Days = submissions.filter(
    (submission) =>
      now - submission.createdAt.getTime() <= 7 * 24 * 60 * 60 * 1000,
  );

  const topicStats = new Map<
    string,
    {
      attempts: number;
      accepted: number;
      latestTitle: string;
      latestDifficulty: string;
    }
  >();

  for (const submission of submissions) {
    const current = topicStats.get(submission.problem.topic) ?? {
      attempts: 0,
      accepted: 0,
      latestTitle: submission.problem.title,
      latestDifficulty: submission.problem.difficulty,
    };

    current.attempts += 1;
    if (submission.status === "ACCEPTED") {
      current.accepted += 1;
    }
    topicStats.set(submission.problem.topic, {
      ...current,
      latestTitle: submission.problem.title,
      latestDifficulty: submission.problem.difficulty,
    });
  }

  const weakTopics = Array.from(topicStats.entries())
    .map(([topic, stat]) => ({
      topic,
      attempts: stat.attempts,
      accepted: stat.accepted,
      passRate: stat.attempts > 0 ? stat.accepted / stat.attempts : 0,
      latestTitle: stat.latestTitle,
      latestDifficulty: stat.latestDifficulty,
    }))
    .filter((item) => item.attempts >= 2)
    .sort((a, b) => a.passRate - b.passRate)
    .slice(0, 3);

  const recentSubmissions = submissions.slice(0, 5).map((submission) => {
    const dateText = new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(submission.createdAt);

    return `${dateText}｜${submission.problem.title}｜${submission.problem.topic}｜${submission.status}｜得分 ${submission.score}`;
  });

  const backgroundLines = [
    `- 学习者：${name}`,
    totalSubmissions > 0
      ? `- 平台内提交记录：累计 ${totalSubmissions} 次，${acceptedSubmissions} 次通过，通过率 ${formatPercentage(acceptedRate)}`
      : "- 平台内提交记录：当前还没有可用的提交记录",
    `- 最近 7 天提交：${last7Days.length} 次`,
  ];

  if (weakTopics.length > 0) {
    backgroundLines.push(
      `- 薄弱知识点：${weakTopics
        .map(
          (item) =>
            `${item.topic}（${item.attempts} 次，${formatPercentage(item.passRate)}）`,
        )
        .join("、")}`,
    );
  } else {
    backgroundLines.push("- 薄弱知识点：当前没有足够多的重复尝试样本");
  }

  if (aiWeeklySummary?.trim()) {
    backgroundLines.push(
      `- 平台 AI 周报：${aiWeeklySummary.trim().replace(/\s+/g, " ")}`,
    );
  }

  if (recentSubmissions.length > 0) {
    backgroundLines.push("- 最近提交样本：");
    backgroundLines.push(...recentSubmissions.map((item) => `  - ${item}`));
  }

  backgroundLines.push(
    "- 说明：以上背景仅来自本平台可见的学习数据与统计，不包含平台外信息。",
  );

  return backgroundLines.join("\n");
}

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
    const incomingMessages: unknown[] = Array.isArray(body?.messages)
      ? body.messages
      : [];
    const context =
      typeof body?.context === "string" ? body.context.trim() : "";

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        aiProvider: true,
        aiModel: true,
        aiApiKey: true,
        aiWeeklySummary: true,
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
        submissions: {
          orderBy: { createdAt: "desc" },
          take: 80,
          select: {
            createdAt: true,
            status: true,
            score: true,
            problem: {
              select: {
                title: true,
                topic: true,
                difficulty: true,
                slug: true,
              },
            },
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
      "你是一个面向在线评测平台的 AI 学习助手。请用简洁、自然、专业的中文回答，优先结合本平台学习背景、用户提供的上下文、题目与学习目标。每次回答都必须先说明你参考了哪些本平台学习背景，再给出分析或建议。不要声称没有访问做题或提交记录的权限，不要提及平台外数据，也不要编造未提供的记录；如果背景不足，只能说明“根据目前本平台内可见的学习情况”并据此给出建议。支持 Markdown 和数学公式输出。";

    const learningBackground = buildLearningBackground({
      name: user.name,
      aiWeeklySummary: user.aiWeeklySummary ?? null,
      submissions: user.submissions,
    });

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "system",
        content:
          "以下是该用户在本平台内可见的学习背景，仅用于回答当前问题，不要逐字复述：\n\n" +
          learningBackground,
      },
      ...(context
        ? [
            {
              role: "system" as const,
              content:
                "以下是用户额外提供的参考资料，仅用于辅助回答，不要逐字复述，除非回答需要引用：\n\n" +
                context,
            },
          ]
        : []),
      ...incomingMessages
        .filter(
          (
            message: unknown,
          ): message is Pick<ChatMessage, "role" | "content"> =>
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
