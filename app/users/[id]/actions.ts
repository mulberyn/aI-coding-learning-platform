"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const QWEN_API_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

type WeeklySubmission = {
  createdAt: Date;
  status: string;
  score: number;
  problem: {
    title: string;
    topic: string;
    difficulty: string;
  };
};

type WeeklyStats = {
  solvedCount: number;
  submissionCount: number;
  acceptedCount: number;
  weakTopics: string[];
  topicSummary: string;
  activitySummary: string;
};

type LLMConfig = {
  provider: string;
  model: string;
  apiKey: string;
  name: string;
};

export type RecommendationItem = {
  title: string;
  href: string;
  reason: string;
  meta: string;
};

export type RecommendationGroup = {
  title: string;
  description: string;
  items: RecommendationItem[];
};

function inLastDays(date: Date, days: number, offsetDays = 0) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const end = now - offsetDays * dayMs;
  const start = end - days * dayMs;
  const time = date.getTime();
  return time >= start && time < end;
}

function buildWeeklyStats(submissions: WeeklySubmission[]) {
  const acceptedProblems = new Set<string>();
  const topicMap = new Map<string, { attempts: number; accepted: number }>();

  for (const submission of submissions) {
    const topicStat = topicMap.get(submission.problem.topic) ?? {
      attempts: 0,
      accepted: 0,
    };
    topicStat.attempts += 1;
    if (submission.status === "ACCEPTED") {
      topicStat.accepted += 1;
      acceptedProblems.add(submission.problem.title);
    }
    topicMap.set(submission.problem.topic, topicStat);
  }

  const weakTopics = Array.from(topicMap.entries())
    .map(([topic, stat]) => ({
      topic,
      passRate: stat.attempts > 0 ? stat.accepted / stat.attempts : 0,
      attempts: stat.attempts,
    }))
    .filter((item) => item.attempts >= 2)
    .sort((a, b) => a.passRate - b.passRate)
    .slice(0, 3)
    .map((item) => item.topic);

  const acceptedCount = submissions.filter(
    (submission) => submission.status === "ACCEPTED",
  ).length;

  return {
    solvedCount: acceptedProblems.size,
    submissionCount: submissions.length,
    acceptedCount,
    weakTopics,
    topicSummary:
      weakTopics.length > 0 ? weakTopics.join("、") : "暂无明显薄弱模块",
    activitySummary:
      submissions.length > 0
        ? `本周共有 ${submissions.length} 次提交，其中通过 ${acceptedCount} 次。`
        : "本周暂无提交记录。",
  } satisfies WeeklyStats;
}

function buildFallbackSummary(userName: string, stats: WeeklyStats) {
  const focusText =
    stats.weakTopics.length > 0
      ? `建议优先补强 ${stats.topicSummary}，持续做同类题能更快稳定正确率。`
      : "当前没有明显薄弱模块，可以尝试更高难度题目与多模块混合训练。";

  return `你好，${userName}。${stats.activitySummary}累计通过 ${stats.solvedCount} 道题。${focusText}`;
}

async function fetchDeepseekSummary(params: {
  apiKey: string;
  model: string;
  userName: string;
  stats: WeeklyStats;
}) {
  const { apiKey, model, userName, stats } = params;
  const prompt = [
    `你是一个OJ学习教练，请用简洁、积极、专业的中文，为用户生成“本周AI评语”。`,
    `用户昵称：${userName}`,
    `本周提交次数：${stats.submissionCount}`,
    `本周通过次数：${stats.acceptedCount}`,
    `本周通过题数：${stats.solvedCount}`,
    `薄弱模块：${stats.topicSummary}`,
    `输出要求：`,
    `1. 2-4 句即可。`,
    `2. 要包含学习状态总结与下周建议。`,
    `3. 不要使用列表。`,
    `4. 语气自然，不要过度夸张。`,
  ].join("\n");

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是一个面向在线评测系统的学习助手，擅长给出简洁、有针对性的学习建议。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.45,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Deepseek request failed with ${response.status}`);
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
    throw new Error("Deepseek response did not contain content");
  }

  return content;
}

async function fetchQwenSummary(params: {
  apiKey: string;
  model: string;
  userName: string;
  stats: WeeklyStats;
}) {
  const { apiKey, model, userName, stats } = params;
  const prompt = [
    `你是一个OJ学习教练，请用简洁、积极、专业的中文，为用户生成"本周AI评语"。`,
    `用户昵称：${userName}`,
    `本周提交次数：${stats.submissionCount}`,
    `本周通过次数：${stats.acceptedCount}`,
    `本周通过题数：${stats.solvedCount}`,
    `薄弱模块：${stats.topicSummary}`,
    `输出要求：`,
    `1. 2-4 句即可。`,
    `2. 要包含学习状态总结与下周建议。`,
    `3. 不要使用列表。`,
    `4. 语气自然，不要过度夸张。`,
  ].join("\n");

  const response = await fetch(QWEN_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是一个面向在线评测系统的学习助手，擅长给出简洁、有针对性的学习建议。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.45,
    }),
  });

  if (!response.ok) {
    throw new Error(`Qwen request failed with ${response.status}`);
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
    throw new Error("Qwen response did not contain content");
  }

  return content;
}

async function fetchLLMSummary(params: {
  provider: string;
  model: string;
  apiKey: string;
  userName: string;
  stats: WeeklyStats;
}) {
  const { provider, model, apiKey, userName, stats } = params;

  if (provider === "deepseek") {
    return fetchDeepseekSummary({ apiKey, model, userName, stats });
  } else if (provider === "qwen") {
    return fetchQwenSummary({ apiKey, model, userName, stats });
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function loadOwnerUser(userId: string) {
  const session = await auth();
  if (session?.user?.id !== userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      aiProvider: true,
      aiModel: true,
      aiApiKey: true,
      apiKeyConfigs: {
        select: {
          id: true,
          provider: true,
          model: true,
          apiKey: true,
          name: true,
          isActive: true,
        },
        where: {
          isActive: true,
        },
      },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 120,
        select: {
          createdAt: true,
          status: true,
          score: true,
          problem: {
            select: {
              title: true,
              topic: true,
              difficulty: true,
            },
          },
        },
      },
    },
  });
}

function buildFallbackRecommendations() {
  return [] satisfies RecommendationGroup[];
}

async function fetchLLMRecommendations(params: {
  provider: string;
  model: string;
  apiKey: string;
  userName: string;
  solvedProblems: string[];
  weakTopics: string[];
}) {
  const { provider, model, apiKey, userName, solvedProblems, weakTopics } =
    params;

  const prompt = [
    `你是一个OJ学习推荐系统，请根据用户历史行为输出三组推荐：题目、比赛、讨论帖。`,
    `请严格输出 JSON，不要输出额外文字。JSON 结构如下：`,
    `{"groups":[{"title":"题目推荐","description":"...","items":[{"title":"...","href":"...","reason":"...","meta":"..."}]}]}`,
    `每组只输出 1-2 条推荐。`,
    `用户昵称：${userName}`,
    `最近通过题目：${solvedProblems.join("、") || "暂无"}`,
    `近期薄弱模块：${weakTopics.join("、") || "暂无"}`,
    `链接仅允许使用站内路径，例如 /problems、/contests、/forum 及其详情页。`,
  ].join("\n");

  const endpoint =
    provider === "qwen"
      ? "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
      : "https://api.deepseek.com/chat/completions";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是一个为在线评测平台服务的推荐助手，只输出 JSON，不要额外说明。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.35,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Recommendation request failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const rawContent = data.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new Error("Recommendation response did not contain content");
  }

  const jsonStart = rawContent.indexOf("{");
  const jsonEnd = rawContent.lastIndexOf("}");
  const jsonText =
    jsonStart >= 0 && jsonEnd > jsonStart
      ? rawContent.slice(jsonStart, jsonEnd + 1)
      : rawContent;

  const parsed = JSON.parse(jsonText) as {
    groups?: Array<{
      title?: string;
      description?: string;
      items?: RecommendationItem[];
    }>;
  };

  const groups = parsed.groups
    ?.map((group) => ({
      title: group.title?.trim() || "推荐",
      description: group.description?.trim() || "",
      items: (group.items ?? [])
        .filter((item) => item.title && item.href)
        .slice(0, 2)
        .map((item) => ({
          title: item.title.trim(),
          href: item.href.trim(),
          reason: item.reason?.trim() || "根据当前学习节奏推荐",
          meta: item.meta?.trim() || "智学编程 推荐",
        })),
    }))
    .filter((group) => group.items.length > 0);

  if (!groups || groups.length === 0) {
    throw new Error("Recommendation response did not contain valid groups");
  }

  return groups satisfies RecommendationGroup[];
}

export async function generateLearningRecommendations(params: {
  userName: string;
  aiProvider: string;
  aiModel: string;
  apiKeyConfigs: LLMConfig[];
  aiApiKey?: string | null;
  submissions: WeeklySubmission[];
}) {
  // 初始加载时返回空数组，只在用户手动刷新时才生成推荐
  return [] satisfies RecommendationGroup[];
}

export async function saveAiSettings(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) {
    return;
  }

  const session = await auth();
  if (session?.user?.id !== userId) {
    return;
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  const aiProvider = String(formData.get("aiProvider") ?? "deepseek").trim();
  const aiModel = String(formData.get("aiModel") ?? "deepseek-chat").trim();
  const aiApiKey = String(formData.get("aiApiKey") ?? "").trim();

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(displayName ? { name: displayName } : {}),
      aiProvider: aiProvider || "deepseek",
      aiModel: aiModel || "deepseek-chat",
      ...(aiApiKey ? { aiApiKey } : {}),
    },
  });

  revalidatePath(`/users/${userId}`);
  revalidatePath(`/users/${userId}/settings`);
}

export async function refreshWeeklyAiSummary(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) {
    return;
  }

  const user = await loadOwnerUser(userId);
  if (!user) {
    return;
  }

  const weeklySubmissions = user.submissions.filter((submission) =>
    inLastDays(submission.createdAt, 7),
  );
  const previousWeekSubmissions = user.submissions.filter((submission) =>
    inLastDays(submission.createdAt, 7, 7),
  );

  const currentStats = buildWeeklyStats(
    weeklySubmissions as WeeklySubmission[],
  );
  const previousStats = buildWeeklyStats(
    previousWeekSubmissions as WeeklySubmission[],
  );
  const stats = {
    ...currentStats,
    activitySummary:
      currentStats.submissionCount > 0
        ? `本周共有 ${currentStats.submissionCount} 次提交，比上周 ${
            currentStats.submissionCount - previousStats.submissionCount >= 0
              ? "增加"
              : "减少"
          } ${Math.abs(
            currentStats.submissionCount - previousStats.submissionCount,
          )} 次。`
        : "本周暂无提交记录。",
  } satisfies WeeklyStats;

  const fallbackSummary = buildFallbackSummary(user.name, stats);
  let aiSummary = fallbackSummary;
  let usedProvider = user.aiProvider || "deepseek";
  let usedModel = user.aiModel || "deepseek-chat";

  // 优先使用选定的 API Key 配置
  if (user.apiKeyConfigs.length > 0) {
    const activeConfig = user.apiKeyConfigs[0];
    usedProvider = activeConfig.provider;
    usedModel = activeConfig.model;

    try {
      aiSummary = await fetchLLMSummary({
        provider: activeConfig.provider,
        model: activeConfig.model,
        apiKey: activeConfig.apiKey,
        userName: user.name,
        stats,
      });
    } catch (error) {
      console.error("LLM API call failed:", error);
      aiSummary = `${fallbackSummary} 当前 ${activeConfig.provider} 调用暂时不可用，已回退到本地总结。`;
    }
  } else if (user.aiProvider === "deepseek" && user.aiApiKey) {
    // 回退到旧的 Deepseek 配置
    try {
      aiSummary = await fetchDeepseekSummary({
        apiKey: user.aiApiKey,
        model: user.aiModel || "deepseek-chat",
        userName: user.name,
        stats,
      });
    } catch {
      aiSummary = `${fallbackSummary} 当前 Deepseek 调用暂时不可用，已回退到本地总结。`;
    }
  } else {
    aiSummary = `${fallbackSummary} 请先在设置页配置大模型 API Key 后再启用模型刷新。`;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      aiWeeklySummary: aiSummary,
      aiWeeklySummaryUpdatedAt: new Date(),
      aiProvider: usedProvider,
      aiModel: usedModel,
    },
  });

  revalidatePath(`/users/${userId}`);
}

export async function refreshRecommendations(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) {
    return;
  }

  const session = await auth();
  if (session?.user?.id !== userId) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 160,
        select: {
          createdAt: true,
          status: true,
          score: true,
          problem: {
            select: {
              title: true,
              slug: true,
              topic: true,
              difficulty: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return;
  }

  // 提取已解决的题目和薄弱模块
  const solvedProblems = new Set(
    user.submissions
      .filter((submission) => submission.status === "ACCEPTED")
      .map((submission) => submission.problem.slug),
  );

  const topicAttempts = new Map<
    string,
    { attempts: number; accepted: number }
  >();
  for (const submission of user.submissions) {
    const topicStat = topicAttempts.get(submission.problem.topic) ?? {
      attempts: 0,
      accepted: 0,
    };
    topicStat.attempts += 1;
    if (submission.status === "ACCEPTED") {
      topicStat.accepted += 1;
    }
    topicAttempts.set(submission.problem.topic, topicStat);
  }

  const weakTopics = Array.from(topicAttempts.entries())
    .map(([topic, stat]) => ({
      topic,
      attempts: stat.attempts,
      passRate: stat.attempts > 0 ? stat.accepted / stat.attempts : 0,
    }))
    .filter((item) => item.attempts >= 2)
    .sort((a, b) => a.passRate - b.passRate)
    .slice(0, 3)
    .map((item) => item.topic);

  // 生成基于数据库的真实推荐
  const recommendations = await buildDatabaseRecommendations(
    userId,
    solvedProblems,
    weakTopics,
  );

  // 将推荐保存到用户数据
  await prisma.user.update({
    where: { id: userId },
    data: {
      aiRecommendations: JSON.stringify(recommendations),
      aiRecommendationsUpdatedAt: new Date(),
    },
  });

  revalidatePath("/analytics");
  revalidatePath(`/users/${userId}`);
}

async function buildDatabaseRecommendations(
  userId: string,
  solvedProblems: Set<string>,
  weakTopics: string[],
): Promise<RecommendationGroup[]> {
  const recommendations: RecommendationGroup[] = [];

  // 题目推荐：查询用户未解决且与薄弱模块相关的题目
  let problemRecommendations = await prisma.problem.findMany({
    where: {
      ...(weakTopics.length > 0
        ? { topic: { in: weakTopics } }
        : { difficulty: "MEDIUM" }),
    },
    select: {
      slug: true,
      title: true,
      topic: true,
      difficulty: true,
    },
    take: 5,
    orderBy: { difficulty: "asc" },
  });

  // 优先推荐未解决的题目
  let unsolvedProblems = problemRecommendations.filter(
    (p) => !solvedProblems.has(p.slug),
  );

  // 如果没有未解决的题目，就使用所有查询结果（包括已解决的）
  const itemsToRecommend =
    unsolvedProblems.length > 0 ? unsolvedProblems : problemRecommendations;

  if (itemsToRecommend.length > 0) {
    const items: RecommendationItem[] = itemsToRecommend
      .slice(0, 2)
      .map((problem) => {
        const isSolved = solvedProblems.has(problem.slug);
        return {
          title: problem.title,
          href: `/problems/${problem.slug}`,
          reason: isSolved
            ? `${problem.topic} - 参考已掌握的题目`
            : `${problem.topic} 是你的薄弱模块，优先补强。`,
          meta: `${problem.topic} · ${problem.difficulty}${isSolved ? " · 已解决" : ""}`,
        };
      });

    if (items.length > 0) {
      recommendations.push({
        title: "题目推荐",
        description: "基于你的薄弱模块",
        items,
      });
    }
  }

  // 比赛推荐：查询24小时内开始的比赛
  const now = new Date();
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const contestRecommendations = await prisma.contest.findMany({
    where: {
      startTime: {
        gte: now,
        lte: oneDayLater,
      },
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      status: true,
    },
    take: 2,
    orderBy: { startTime: "asc" },
  });

  if (contestRecommendations.length > 0) {
    const items: RecommendationItem[] = contestRecommendations.map(
      (contest) => ({
        title: contest.title,
        href: `/contests/${contest.id}`,
        reason: "即将开始的比赛，现在参赛还有机会获得成绩。",
        meta: `${contest.status} · ${new Date(contest.startTime).toLocaleDateString()}`,
      }),
    );

    recommendations.push({
      title: "比赛推荐",
      description: "即将开始的精选比赛",
      items,
    });
  }

  // 讨论帖推荐：查询最近的相关讨论
  const forumRecommendations = await prisma.forumPost.findMany({
    where:
      weakTopics.length > 0
        ? {
            problem: {
              topic: {
                in: weakTopics,
              },
            },
          }
        : {
            board: "PROBLEM",
          },
    select: {
      id: true,
      title: true,
      board: true,
      createdAt: true,
    },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  if (forumRecommendations.length > 0) {
    const items: RecommendationItem[] = forumRecommendations
      .slice(0, 2)
      .map((post) => ({
        title: post.title,
        href: `/forum/${post.id}`,
        reason: "社区讨论，可能有你遇到的问题的解答。",
        meta: `${post.board} · ${new Date(post.createdAt).toLocaleDateString()}`,
      }));

    if (items.length > 0) {
      recommendations.push({
        title: "讨论推荐",
        description: "相关话题的社区讨论",
        items,
      });
    }
  }

  return recommendations;
}
