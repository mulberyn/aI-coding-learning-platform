import { auth } from "@/auth";
import { SiteShell } from "@/components/site-shell";
import { LearningOverviewPanel } from "@/app/components/LearningOverviewPanel";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { type RecommendationGroup } from "@/app/users/[id]/actions";
import { CheckCircle2, Flame, Target, Bot } from "lucide-react";

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDateTime(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  const second = `${date.getSeconds()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function formatChange(value: number, suffix: string) {
  if (value === 0) {
    return `±0${suffix}`;
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}${suffix}`;
}

function getWindowBounds(weeksAgo: number) {
  const now = Date.now();
  const end = now - weeksAgo * 7 * DAY_MS;
  const start = end - 7 * DAY_MS;
  return { start, end };
}

function buildFallbackAiSummary(params: {
  solvedCount: number;
  weakModuleText: string;
  weakModulesLength: number;
}) {
  const { solvedCount, weakModuleText, weakModulesLength } = params;

  return `本周你保持了稳定的提交节奏，累计通过题目 ${solvedCount} 道。${
    weakModulesLength > 0
      ? `建议继续补强 ${weakModuleText}，优先做同类题来提升稳定性。`
      : "当前没有明显短板，可以开始尝试更高难度的综合题。"
  }`;
}

function buildWeeklyMetricSeries(
  submissions: Array<{
    createdAt: Date;
    status: string;
    score: number;
    problem: { slug: string; topic: string };
  }>,
) {
  return Array.from({ length: 4 }, (_, index) => {
    const { start, end } = getWindowBounds(3 - index);
    const weekSubmissions = submissions.filter(
      (submission) =>
        submission.createdAt.getTime() >= start &&
        submission.createdAt.getTime() < end,
    );

    const solvedSet = new Set<string>();
    const topicMap = new Map<string, { attempts: number; accepted: number }>();

    for (const submission of weekSubmissions) {
      const topicItem = topicMap.get(submission.problem.topic) ?? {
        attempts: 0,
        accepted: 0,
      };
      topicItem.attempts += 1;
      if (submission.status === "ACCEPTED") {
        topicItem.accepted += 1;
        solvedSet.add(submission.problem.slug);
      }
      topicMap.set(submission.problem.topic, topicItem);
    }

    const solvedCount = solvedSet.size;
    const knowledgePoints = Math.max(1, Math.round(solvedCount * 0.55));
    const aiRounds = Math.max(0, Math.round(weekSubmissions.length / 3));
    const weakModules = Array.from(topicMap.values()).filter(
      (item) => item.attempts >= 2 && item.accepted / item.attempts < 0.55,
    ).length;

    return {
      solvedCount,
      knowledgePoints,
      aiRounds,
      weakModules,
      submissionCount: weekSubmissions.length,
    };
  });
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      aiProvider: true,
      aiModel: true,
      aiApiKey: true,
      aiWeeklySummary: true,
      aiWeeklySummaryUpdatedAt: true,
      aiRecommendations: true,
      aiRecommendationsUpdatedAt: true,
      apiKeyConfigs: {
        where: { isActive: true },
        select: {
          provider: true,
          model: true,
          name: true,
          apiKey: true,
        },
        take: 1,
      },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 400,
        select: {
          createdAt: true,
          status: true,
          score: true,
          problem: {
            select: {
              slug: true,
              title: true,
              topic: true,
              difficulty: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const allSubmissions = user.submissions;
  const weeklySeries = buildWeeklyMetricSeries(allSubmissions);
  const currentWeek = weeklySeries.at(-1) ?? {
    solvedCount: 0,
    knowledgePoints: 0,
    aiRounds: 0,
    weakModules: 0,
    submissionCount: 0,
  };
  const previousWeek = weeklySeries.at(-2) ?? currentWeek;

  const solvedCount = allSubmissions.reduce((count, submission) => {
    if (submission.status === "ACCEPTED") {
      return count + 1;
    }
    return count;
  }, 0);

  const topicAttempts = new Map<
    string,
    { attempts: number; accepted: number }
  >();
  for (const submission of allSubmissions) {
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

  const weakModules = Array.from(topicAttempts.entries())
    .map(([topic, stat]) => ({
      topic,
      attempts: stat.attempts,
      passRate: stat.attempts > 0 ? stat.accepted / stat.attempts : 0,
    }))
    .filter((item) => item.attempts >= 2)
    .sort((a, b) => a.passRate - b.passRate)
    .slice(0, 3);

  const weakModuleText =
    weakModules.length > 0
      ? weakModules.map((item) => item.topic).join("、")
      : "暂无明显薄弱模块";

  const aiSummary =
    user.aiWeeklySummary?.trim() ||
    buildFallbackAiSummary({
      solvedCount,
      weakModuleText,
      weakModulesLength: weakModules.length,
    });
  const aiSummaryUpdatedText = user.aiWeeklySummaryUpdatedAt
    ? formatDateTime(user.aiWeeklySummaryUpdatedAt)
    : "尚未刷新";

  const aiProviderLabel =
    user.apiKeyConfigs[0]?.provider ?? user.aiProvider ?? "deepseek";
  const aiModelLabel =
    user.apiKeyConfigs[0]?.model ?? user.aiModel ?? "deepseek-chat";

  const solvedWeeklyDelta = currentWeek.solvedCount - previousWeek.solvedCount;
  const knowledgeWeeklyDelta =
    currentWeek.knowledgePoints - previousWeek.knowledgePoints;
  const aiWeeklyDelta = currentWeek.aiRounds - previousWeek.aiRounds;
  const weakWeeklyDelta = currentWeek.weakModules - previousWeek.weakModules;

  const metrics = [
    {
      label: "完成题目数",
      value: currentWeek.solvedCount,
      suffix: " 道",
      deltaLabel: formatChange(solvedWeeklyDelta, " 道"),
      deltaClassName:
        solvedWeeklyDelta >= 0
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "bg-rose-500/10 text-rose-700 dark:text-rose-300",
      accentClassName: "text-emerald-600 dark:text-emerald-400",
      series: weeklySeries.map((item) => item.solvedCount),
      helper: "统计最近一周通过的题目数量",
      Icon: CheckCircle2,
    },
    {
      label: "掌握知识点数量",
      value: currentWeek.knowledgePoints,
      suffix: " 个",
      deltaLabel: formatChange(knowledgeWeeklyDelta, " 个"),
      deltaClassName:
        knowledgeWeeklyDelta >= 0
          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
          : "bg-rose-500/10 text-rose-700 dark:text-rose-300",
      accentClassName: "text-sky-600 dark:text-sky-400",
      series: weeklySeries.map((item) => item.knowledgePoints),
      helper: "用通过题目数折算得到的知识点覆盖度",
      Icon: Target,
    },
    {
      label: "AI 辅导轮次",
      value: currentWeek.aiRounds,
      suffix: " 轮",
      deltaLabel: formatChange(aiWeeklyDelta, " 轮"),
      deltaClassName:
        aiWeeklyDelta >= 0
          ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
          : "bg-rose-500/10 text-rose-700 dark:text-rose-300",
      accentClassName: "text-violet-600 dark:text-violet-400",
      series: weeklySeries.map((item) => item.aiRounds),
      helper: "按提交密度估算本周的 AI 辅导节奏",
      Icon: Bot,
    },
    {
      label: "薄弱模块",
      value: currentWeek.weakModules,
      suffix: " 个",
      deltaLabel:
        weakWeeklyDelta === 0
          ? "±0 个"
          : weakWeeklyDelta < 0
            ? `${weakWeeklyDelta} 个`
            : `+${weakWeeklyDelta} 个`,
      deltaClassName:
        weakWeeklyDelta <= 0
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "bg-rose-500/10 text-rose-700 dark:text-rose-300",
      accentClassName: "text-amber-600 dark:text-amber-400",
      series: weeklySeries.map((item) => item.weakModules),
      helper: "统计最近一周命中率偏低的模块数量",
      Icon: Flame,
    },
  ];

  // 初始加载时推荐为空，只有用户手动点击"刷新推荐"按钮时才会生成推荐
  let recommendations: RecommendationGroup[] = [];
  try {
    if (user.aiRecommendations) {
      recommendations = JSON.parse(
        user.aiRecommendations,
      ) as RecommendationGroup[];
    }
  } catch {
    recommendations = [];
  }

  return (
    <SiteShell requireAuth={false}>
      <LearningOverviewPanel
        userId={user.id}
        displayName={user.name}
        aiProviderLabel={aiProviderLabel}
        aiModelLabel={aiModelLabel}
        aiSummary={aiSummary}
        aiSummaryUpdatedText={aiSummaryUpdatedText}
        metrics={metrics}
        recommendations={recommendations}
      />
    </SiteShell>
  );
}
