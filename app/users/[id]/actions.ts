"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

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

  if (user.aiProvider === "deepseek" && user.aiApiKey) {
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
  } else if (!user.aiApiKey) {
    aiSummary = `${fallbackSummary} 请先在设置页填写 Deepseek API Key 后再启用模型刷新。`;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      aiWeeklySummary: aiSummary,
      aiWeeklySummaryUpdatedAt: new Date(),
    },
  });

  revalidatePath(`/users/${userId}`);
}
