import { SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const QWEN_API_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type LlmConfig = {
  provider: string;
  model: string;
  apiKey: string;
  configName: string | null;
};

export type KnowledgePointRecommendation = {
  topic: string;
  reason: string;
};

export type TopicProblemRecommendation = {
  reason: string;
  slugs: string[];
};

function getProviderEndpoint(provider: string) {
  return provider === "qwen" ? QWEN_API_URL : DEEPSEEK_API_URL;
}

async function callProviderChat(params: {
  provider: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
}) {
  const { provider, apiKey, model, messages } = params;
  const response = await fetch(getProviderEndpoint(provider), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.25,
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

async function getLlmConfig(userId: string): Promise<LlmConfig | null> {
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
          name: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const selectedConfig = user.apiKeyConfigs[0];
  const apiKey = selectedConfig?.apiKey ?? user.aiApiKey;

  if (!apiKey) {
    return null;
  }

  return {
    provider: (
      selectedConfig?.provider ??
      user.aiProvider ??
      "deepseek"
    ).toLowerCase(),
    model: selectedConfig?.model ?? user.aiModel ?? "deepseek-chat",
    apiKey,
    configName: selectedConfig?.name ?? null,
  };
}

function parseJsonBlock<T>(content: string): T | null {
  const trimmed = content.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const jsonText =
    start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;

  try {
    return JSON.parse(jsonText) as T;
  } catch {
    return null;
  }
}

async function getRecentTopicStats(userId: string | null) {
  if (!userId) {
    const problemTopics = await prisma.problem.findMany({
      select: { topic: true },
      orderBy: { createdAt: "asc" },
    });

    const uniqueTopics = Array.from(
      new Set(problemTopics.map((item) => item.topic)),
    ).slice(0, 4);

    return uniqueTopics.map((topic, index) => ({
      topic,
      attempts: 0,
      accepted: 0,
      recentCount: Math.max(0, 4 - index),
    }));
  }

  const submissions = await prisma.submission.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      status: true,
      createdAt: true,
      problem: {
        select: {
          topic: true,
          title: true,
        },
      },
    },
  });

  const topicStats = new Map<
    string,
    {
      topic: string;
      attempts: number;
      accepted: number;
      recentCount: number;
      latestAt: Date;
    }
  >();

  submissions.forEach((submission, index) => {
    const topic = submission.problem.topic;
    const current = topicStats.get(topic) ?? {
      topic,
      attempts: 0,
      accepted: 0,
      recentCount: 0,
      latestAt: submission.createdAt,
    };

    current.attempts += 1;
    if (submission.status === SubmissionStatus.ACCEPTED) {
      current.accepted += 1;
    }
    current.recentCount += Math.max(0, 80 - index);
    if (submission.createdAt > current.latestAt) {
      current.latestAt = submission.createdAt;
    }
    topicStats.set(topic, current);
  });

  return Array.from(topicStats.values())
    .sort((left, right) => {
      const leftScore =
        left.attempts - left.accepted * 0.65 + left.recentCount * 0.015;
      const rightScore =
        right.attempts - right.accepted * 0.65 + right.recentCount * 0.015;
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }
      return right.latestAt.getTime() - left.latestAt.getTime();
    })
    .slice(0, 4)
    .map((item) => ({
      topic: item.topic,
      attempts: item.attempts,
      accepted: item.accepted,
      recentCount: item.recentCount,
    }));
}

function buildFallbackKnowledgeReasons(
  topics: Array<{ topic: string; attempts: number; accepted: number }>,
) {
  return topics.slice(0, 2).map((item) => ({
    topic: item.topic,
    reason:
      item.attempts > 0 && item.accepted < item.attempts
        ? "近期练习较多，适合继续巩固。"
        : "可以顺着当前进度继续扩展。",
  }));
}

export async function getKnowledgePointRecommendations(userId: string | null) {
  const topicStats = await getRecentTopicStats(userId);
  if (topicStats.length === 0) {
    return [] as KnowledgePointRecommendation[];
  }

  if (!userId) {
    return buildFallbackKnowledgeReasons(topicStats).slice(0, 2);
  }

  const config = await getLlmConfig(userId);
  if (!config) {
    return buildFallbackKnowledgeReasons(topicStats).slice(0, 2);
  }

  try {
    const prompt = [
      "请根据用户近期的学习情况，推荐 1-2 个最适合继续练习的知识点。",
      "只输出 JSON，不要输出任何解释文本。JSON 结构：",
      '{"items":[{"topic":"","reason":""}]}',
      "要求：",
      "1. reason 需要简短，中文，20-30 字以内。",
      "2. topic 必须从候选列表里选择，保持原样输出。",
      "3. 优先选择最近尝试较多、掌握度相对薄弱的知识点。",
      `候选知识点：${topicStats
        .map(
          (item) =>
            `${item.topic}（尝试 ${item.attempts} 次，已通过 ${item.accepted} 次）`,
        )
        .join("；")}`,
    ].join("\n");

    const raw = await callProviderChat({
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      messages: [
        {
          role: "system",
          content: "你是一个在线编程学习平台的知识点推荐器，只输出 JSON。",
        },
        { role: "user", content: prompt },
      ],
    });

    const parsed = parseJsonBlock<{
      items?: Array<{ topic?: string; reason?: string }>;
    }>(raw);

    const allowedTopics = new Set(topicStats.map((item) => item.topic));
    const items =
      parsed?.items
        ?.filter((item): item is { topic: string; reason: string } =>
          Boolean(
            item?.topic && allowedTopics.has(item.topic) && item.reason?.trim(),
          ),
        )
        .slice(0, 2) ?? [];

    if (items.length > 0) {
      return items.map((item) => ({
        topic: item.topic,
        reason: item.reason.trim(),
      }));
    }
  } catch (error) {
    console.error("Failed to generate knowledge point recommendations:", error);
  }

  return buildFallbackKnowledgeReasons(topicStats).slice(0, 2);
}

export async function getTopicProblemRecommendation(params: {
  userId: string;
  topic: string;
}) {
  const { userId, topic } = params;
  const config = await getLlmConfig(userId);

  const candidateProblems = await prisma.problem.findMany({
    where: {
      topic,
    },
    select: {
      slug: true,
      title: true,
      topic: true,
      source: true,
      difficulty: true,
      createdAt: true,
    },
    orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
    take: 18,
  });

  if (candidateProblems.length === 0) {
    return { reason: "当前知识点暂无题目", slugs: [] as string[] };
  }

  const candidateMap = new Map(
    candidateProblems.map((problem) => [problem.slug, problem]),
  );

  if (!config) {
    return {
      reason: "根据当前知识点优先练习题库内的基础题目。",
      slugs: candidateProblems.slice(0, 5).map((problem) => problem.slug),
    };
  }

  const recentSubmissions = await prisma.submission.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      status: true,
      problem: {
        select: {
          topic: true,
          title: true,
        },
      },
    },
  });

  const recentTopics = Array.from(
    new Set(recentSubmissions.map((submission) => submission.problem.topic)),
  ).slice(0, 8);

  try {
    const prompt = [
      "你是一个在线编程题目推荐器，请根据用户近期学习情况，在候选题目中挑选 3-5 道最值得练习的题目。",
      "只输出 JSON，不要输出任何解释文本。JSON 结构：",
      '{"reason":"","slugs":["problem-slug-1","problem-slug-2"]}',
      "要求：",
      "1. slugs 必须严格来自候选题目列表，不要虚构。",
      "2. 优先推荐和当前知识点相关、难度逐步递增的题目。",
      "3. reason 需要简短，中文，说明推荐依据。",
      `当前知识点：${topic}`,
      `近期学习相关知识点：${recentTopics.join("、") || "暂无"}`,
      `候选题目：${candidateProblems
        .map(
          (problem) =>
            `${problem.slug}｜${problem.title}｜${problem.difficulty}｜${problem.source}`,
        )
        .join("；")}`,
    ].join("\n");

    const raw = await callProviderChat({
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      messages: [
        {
          role: "system",
          content: "你是一个在线编程学习平台的题目推荐器，只输出 JSON。",
        },
        { role: "user", content: prompt },
      ],
    });

    const parsed = parseJsonBlock<{ reason?: string; slugs?: string[] }>(raw);
    const slugs = Array.from(
      new Set(
        (parsed?.slugs ?? [])
          .filter((slug): slug is string => typeof slug === "string")
          .filter((slug) => candidateMap.has(slug)),
      ),
    ).slice(0, 5);

    if (slugs.length > 0) {
      return {
        reason:
          parsed?.reason?.trim() ||
          "根据你的当前知识点和历史练习记录精选题目。",
        slugs,
      } satisfies TopicProblemRecommendation;
    }
  } catch (error) {
    console.error("Failed to generate topic problem recommendations:", error);
  }

  return {
    reason: "根据你的当前知识点优先推荐基础到进阶题目。",
    slugs: candidateProblems.slice(0, 5).map((problem) => problem.slug),
  } satisfies TopicProblemRecommendation;
}
