import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  type GeneratedLearningRoute,
  type LearningRoutePointType,
} from "@/lib/learning-route-types";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const QWEN_API_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

type ChatMessage = {
  role: "system" | "user";
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
    throw new Error(`${provider} route request failed with ${response.status}`);
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

function toSafePointType(value: unknown): LearningRoutePointType {
  if (
    value === "problem" ||
    value === "contest" ||
    value === "forum" ||
    value === "custom"
  ) {
    return value;
  }

  return "custom";
}

function fallbackGeneratedRoute(topic: string): GeneratedLearningRoute {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const toDateText = (offset: number) =>
    new Date(now.getTime() + offset * day).toISOString().slice(0, 10);

  return {
    routeName: `${topic} 学习路线`,
    summary: "先完成基础知识梳理，再通过题目和讨论逐步强化，最后做一次阶段复盘。",
    points: [
      {
        title: `梳理 ${topic} 的核心概念与模板`,
        description: "阅读官方题解或资料，整理 8-12 条关键结论。",
        pointType: "custom",
        targetDate: toDateText(1),
        status: "pending",
      },
      {
        title: `完成 3 道 ${topic} 基础题`,
        description: "优先选择通过率较高的题，保证方法正确。",
        pointType: "problem",
        targetDate: toDateText(3),
        status: "pending",
      },
      {
        title: `参加 1 场相关练习赛或虚拟赛`,
        description: "以限时方式训练，记录卡点和耗时。",
        pointType: "contest",
        targetDate: toDateText(6),
        status: "pending",
      },
      {
        title: `发布 1 条学习总结讨论帖`,
        description: "总结易错点，并向社区提问未解决问题。",
        pointType: "forum",
        targetDate: toDateText(7),
        status: "pending",
      },
    ],
  };
}

function parseGeneratedRoute(raw: string, topic: string): GeneratedLearningRoute {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const jsonText =
      start >= 0 && end > start ? raw.slice(start, end + 1) : raw;

    const parsed = JSON.parse(jsonText) as Partial<GeneratedLearningRoute>;
    const routeName =
      typeof parsed.routeName === "string" && parsed.routeName.trim().length > 0
        ? parsed.routeName.trim().slice(0, 80)
        : `${topic} 学习路线`;

    const summary =
      typeof parsed.summary === "string"
        ? parsed.summary.trim().slice(0, 300)
        : "围绕你的输入与历史行为生成的个性化学习路线。";

    const points = Array.isArray(parsed.points)
      ? parsed.points
          .map((item) => ({
            title:
              typeof item?.title === "string"
                ? item.title.trim().slice(0, 120)
                : "未命名学习点",
            description:
              typeof item?.description === "string"
                ? item.description.trim().slice(0, 280)
                : "",
            pointType: toSafePointType(item?.pointType),
            refId:
              typeof item?.refId === "string" && item.refId.trim().length > 0
                ? item.refId.trim().slice(0, 80)
                : null,
            targetDate:
              typeof item?.targetDate === "string" &&
              item.targetDate.trim().length > 0
                ? item.targetDate.trim().slice(0, 20)
                : null,
            status: "pending" as const,
          }))
          .filter((item) => item.title.length > 0)
          .slice(0, 16)
      : [];

    if (points.length === 0) {
      return fallbackGeneratedRoute(topic);
    }

    return { routeName, summary, points };
  } catch {
    return fallbackGeneratedRoute(topic);
  }
}

function summarizeHistory(params: {
  submissions: Array<{ createdAt: Date; status: string; problem: { title: string; topic: string } }>;
  posts: Array<{ title: string; board: string }>;
  contests: Array<{ contest: { title: string; status: string } }>;
}) {
  const { submissions, posts, contests } = params;

  const acceptedCount = submissions.filter(
    (submission) => submission.status === "ACCEPTED",
  ).length;

  const topicAttempts = new Map<string, { attempts: number; accepted: number }>();
  for (const submission of submissions) {
    const item = topicAttempts.get(submission.problem.topic) ?? {
      attempts: 0,
      accepted: 0,
    };
    item.attempts += 1;
    if (submission.status === "ACCEPTED") {
      item.accepted += 1;
    }
    topicAttempts.set(submission.problem.topic, item);
  }

  const weakTopics = Array.from(topicAttempts.entries())
    .map(([topic, stat]) => ({
      topic,
      passRate: stat.attempts > 0 ? stat.accepted / stat.attempts : 0,
      attempts: stat.attempts,
    }))
    .filter((item) => item.attempts >= 2)
    .sort((a, b) => a.passRate - b.passRate)
    .slice(0, 4)
    .map((item) => item.topic);

  return {
    submissionCount: submissions.length,
    acceptedCount,
    weakTopics,
    recentProblems: submissions.slice(0, 8).map((item) => item.problem.title),
    recentPosts: posts.slice(0, 6).map((item) => `${item.title}(${item.board})`),
    recentContests: contests
      .slice(0, 4)
      .map((item) => `${item.contest.title}(${item.contest.status})`),
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const topic =
      typeof body?.topic === "string" && body.topic.trim().length > 0
        ? body.topic.trim().slice(0, 120)
        : "算法与数据结构";

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
        submissions: {
          orderBy: { createdAt: "desc" },
          take: 90,
          select: {
            createdAt: true,
            status: true,
            problem: {
              select: {
                title: true,
                topic: true,
              },
            },
          },
        },
        forumPosts: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            title: true,
            board: true,
          },
        },
        contestRegistrations: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            contest: {
              select: {
                title: true,
                status: true,
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
        { error: "请先在设置中配置并启用 API Key" },
        { status: 400 },
      );
    }

    const behavior = summarizeHistory({
      submissions: user.submissions,
      posts: user.forumPosts,
      contests: user.contestRegistrations,
    });

    const prompt = [
      "请生成一个学习路线 JSON（不要输出任何解释文本，只输出 JSON 对象）。",
      "JSON 格式：",
      '{"routeName":"","summary":"","points":[{"title":"","description":"","pointType":"problem|contest|forum|custom","targetDate":"YYYY-MM-DD"}]}',
      "规则：",
      "1. points 数量 4-8 个，按时间顺序。",
      "2. 学习点必须可执行，动词开头，描述简洁。",
      "3. 结合用户历史数据，优先补足薄弱模块。",
      "4. 时间线给出未来 1-21 天内的目标日期。",
      `用户输入学习目标：${topic}`,
      `用户昵称：${user.name}`,
      `最近提交次数：${behavior.submissionCount}`,
      `最近通过次数：${behavior.acceptedCount}`,
      `薄弱模块：${behavior.weakTopics.join("、") || "暂无明确薄弱模块"}`,
      `最近题目：${behavior.recentProblems.join("、") || "暂无"}`,
      `最近论坛活动：${behavior.recentPosts.join("、") || "暂无"}`,
      `最近比赛记录：${behavior.recentContests.join("、") || "暂无"}`,
    ].join("\n");

    const raw = await callProviderChat({
      provider,
      apiKey,
      model,
      messages: [
        {
          role: "system",
          content:
            "你是在线编程学习平台的学习路径规划器，擅长根据用户行为数据做个性化学习路线。",
        },
        { role: "user", content: prompt },
      ],
    });

    const generated = parseGeneratedRoute(raw, topic);

    return NextResponse.json({
      generated,
      provider,
      model,
      configName: selectedConfig?.name ?? null,
    });
  } catch (error) {
    console.error("recommend learning route failed:", error);
    return NextResponse.json(
      { error: "生成学习路线失败，请检查模型配置" },
      { status: 500 },
    );
  }
}
