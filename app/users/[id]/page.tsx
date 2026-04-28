import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { HeatmapSection } from "./heatmap-section";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  BarChart3,
  BrainCircuit,
  Flame,
  RefreshCw,
  Target,
  Trophy,
} from "lucide-react";
import { refreshWeeklyAiSummary } from "./actions";

type UserProfilePageProps = {
  params: Promise<{ id: string }>;
};

function formatDateTime(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  const ss = `${date.getSeconds()}`.padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function formatDateOnly(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDifficultyText(difficulty: "EASY" | "MEDIUM" | "HARD") {
  if (difficulty === "EASY") return "简单";
  if (difficulty === "MEDIUM") return "普通";
  return "困难";
}

function getRatingInfo(rating: number) {
  if (rating < 1200) {
    return { level: "新手", className: "text-zinc-600 dark:text-zinc-300" };
  }
  if (rating < 1600) {
    return {
      level: "入门",
      className: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (rating < 2000) {
    return { level: "中级", className: "text-blue-600 dark:text-blue-400" };
  }
  if (rating < 2400) {
    return { level: "高级", className: "text-violet-600 dark:text-violet-400" };
  }
  return { level: "专家", className: "text-red-600 dark:text-red-400" };
}

function getHeatColor(count: number, maxCount: number) {
  if (count <= 0) return "bg-panel-strong";
  const ratio = maxCount <= 0 ? 0 : count / maxCount;
  if (ratio < 0.26) return "bg-emerald-200 dark:bg-emerald-900/40";
  if (ratio < 0.51) return "bg-emerald-300 dark:bg-emerald-800/55";
  if (ratio < 0.76) return "bg-emerald-500 dark:bg-emerald-700/80";
  return "bg-emerald-600 dark:bg-emerald-500";
}

function inLastDays(date: Date, days: number, offsetDays = 0) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const end = now - offsetDays * dayMs;
  const start = end - days * dayMs;
  const time = date.getTime();
  return time >= start && time < end;
}

function formatWeeklyDelta(value: number, suffix = "") {
  if (value > 0) {
    return `+${value}${suffix}`;
  }
  if (value < 0) {
    return `${value}${suffix}`;
  }
  return `±0${suffix}`;
}

function countWeakModulesByWindow(
  submissions: Array<{ createdAt: Date; status: string; topic: string }>,
) {
  const stat = new Map<string, { attempts: number; accepted: number }>();

  for (const submission of submissions) {
    const item = stat.get(submission.topic) ?? { attempts: 0, accepted: 0 };
    item.attempts += 1;
    if (submission.status === "ACCEPTED") {
      item.accepted += 1;
    }
    stat.set(submission.topic, item);
  }

  return Array.from(stat.values()).filter(
    (item) => item.attempts >= 2 && item.accepted / item.attempts < 0.55,
  ).length;
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

export default async function UserProfilePage({
  params,
}: UserProfilePageProps) {
  const { id } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      aiProvider: true,
      aiModel: true,
      aiWeeklySummary: true,
      aiWeeklySummaryUpdatedAt: true,
      _count: {
        select: {
          submissions: true,
        },
      },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 400,
        select: {
          id: true,
          status: true,
          score: true,
          createdAt: true,
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
    notFound();
  }

  const allSubmissions = user.submissions;
  const recentSubmissions = allSubmissions.slice(0, 4);
  const isOwner = session?.user?.id === id;

  const solvedMap = new Map<
    string,
    {
      slug: string;
      title: string;
      firstAcceptedAt: Date;
      difficulty: "EASY" | "MEDIUM" | "HARD";
      topic: string;
    }
  >();

  const topicAttempts = new Map<
    string,
    { attempts: number; accepted: number }
  >();
  const dayCountMap = new Map<string, number>();

  for (const submission of allSubmissions) {
    const topic = submission.problem.topic;
    const topicStat = topicAttempts.get(topic) ?? { attempts: 0, accepted: 0 };
    topicStat.attempts += 1;
    if (submission.status === "ACCEPTED") {
      topicStat.accepted += 1;
    }
    topicAttempts.set(topic, topicStat);

    const dayKey = formatDateOnly(submission.createdAt);
    dayCountMap.set(dayKey, (dayCountMap.get(dayKey) ?? 0) + 1);

    if (submission.status === "ACCEPTED") {
      const existed = solvedMap.get(submission.problem.slug);
      if (!existed || existed.firstAcceptedAt > submission.createdAt) {
        solvedMap.set(submission.problem.slug, {
          slug: submission.problem.slug,
          title: submission.problem.title,
          firstAcceptedAt: submission.createdAt,
          difficulty: submission.problem.difficulty,
          topic,
        });
      }
    }
  }

  const solvedProblems = Array.from(solvedMap.values()).sort(
    (a, b) => b.firstAcceptedAt.getTime() - a.firstAcceptedAt.getTime(),
  );

  const weakModules = Array.from(topicAttempts.entries())
    .map(([topic, stat]) => ({
      topic,
      attempts: stat.attempts,
      passRate: stat.attempts > 0 ? stat.accepted / stat.attempts : 0,
    }))
    .filter((item) => item.attempts >= 2)
    .sort((a, b) => a.passRate - b.passRate)
    .slice(0, 3);

  const solvedCount = solvedProblems.length;
  const knowledgePoints = Math.max(1, Math.round(solvedCount * 0.55));
  const aiRounds = Math.max(1, Math.round(user._count.submissions / 3));
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

  const acceptedCount = allSubmissions.filter(
    (submission) => submission.status === "ACCEPTED",
  ).length;
  const rating = Math.min(3200, 800 + solvedCount * 28 + acceptedCount * 2);
  const ratingInfo = getRatingInfo(rating);

  const today = new Date();
  const heatDays: Array<{ dayKey: string; date: Date; count: number }> = [];
  // 展示最近 1 年（365 天），从最旧到最近排列，右侧为最近时间
  for (let i = 364; i >= 0; i -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const dayKey = formatDateOnly(day);
    heatDays.push({
      dayKey,
      date: day,
      count: dayCountMap.get(dayKey) ?? 0,
    });
  }

  const maxHeatCount = Math.max(1, ...heatDays.map((item) => item.count));

  const heatWeeks: Array<Array<(typeof heatDays)[number]>> = [];
  for (let i = 0; i < heatDays.length; i += 7) {
    heatWeeks.push(heatDays.slice(i, i + 7));
  }

  const weekCount = heatWeeks.length;
  // 找出每个月份变化的位置，生成月份标签
  const heatMonthSegments: Array<{ label: string; start: number; width: number }> = [];
  let currentSegmentStart = 0;
  let currentMonth = heatWeeks[0]?.[0]?.date.getMonth() ?? 0;

  for (let i = 0; i < heatWeeks.length; i += 1) {
    const week = heatWeeks[i];
    const weekLastDay = week[week.length - 1];
    if (!weekLastDay) continue;

    const weekMonth = weekLastDay.date.getMonth();
    if (weekMonth !== currentMonth) {
      // 月份发生变化，添加新段
      heatMonthSegments.push({
        label: `${currentMonth + 1}月`,
        start: currentSegmentStart,
        width: i - currentSegmentStart,
      });
      currentSegmentStart = i;
      currentMonth = weekMonth;
    }
  }

  // 添加最后一个月份段
  if (currentSegmentStart < weekCount) {
    heatMonthSegments.push({
      label: `${currentMonth + 1}月`,
      start: currentSegmentStart,
      width: weekCount - currentSegmentStart,
    });
  }

  const solvedWeeklyDelta =
    solvedProblems.filter((item) => inLastDays(item.firstAcceptedAt, 7))
      .length -
    solvedProblems.filter((item) => inLastDays(item.firstAcceptedAt, 7, 7))
      .length;

  const currentWeekSolved = solvedProblems.filter((item) =>
    inLastDays(item.firstAcceptedAt, 7),
  ).length;
  const previousWeekSolved = solvedProblems.filter((item) =>
    inLastDays(item.firstAcceptedAt, 7, 7),
  ).length;

  const knowledgeWeeklyDelta =
    Math.max(0, Math.round(currentWeekSolved * 0.55)) -
    Math.max(0, Math.round(previousWeekSolved * 0.55));

  const aiWeeklyDelta =
    Math.max(
      1,
      Math.round(
        allSubmissions.filter((item) => inLastDays(item.createdAt, 7)).length /
          3,
      ),
    ) -
    Math.max(
      1,
      Math.round(
        allSubmissions.filter((item) => inLastDays(item.createdAt, 7, 7))
          .length / 3,
      ),
    );

  const weakNowCount = countWeakModulesByWindow(
    allSubmissions
      .filter((item) => inLastDays(item.createdAt, 7))
      .map((item) => ({
        createdAt: item.createdAt,
        status: item.status,
        topic: item.problem.topic,
      })),
  );
  const weakPrevCount = countWeakModulesByWindow(
    allSubmissions
      .filter((item) => inLastDays(item.createdAt, 7, 7))
      .map((item) => ({
        createdAt: item.createdAt,
        status: item.status,
        topic: item.problem.topic,
      })),
  );
  const weakWeeklyDelta = weakNowCount - weakPrevCount;

  const recentContestRecords = [
    {
      name: "每周练习赛",
      rank: solvedCount > 0 ? `#${Math.max(5, 220 - solvedCount)}` : "--",
      performance:
        solvedCount > 0 ? `${Math.min(100, 45 + solvedCount)} 分` : "暂无记录",
      date:
        allSubmissions.length > 0
          ? formatDateOnly(allSubmissions[0].createdAt)
          : "--",
    },
  ];

  const displayName = user.name || user.email.split("@")[0];
  const userName = user.email.split("@")[0];
  const avatarText = displayName.slice(0, 1).toUpperCase();

  return (
    <SiteShell requireAuth={false}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* 第一行：学生信息、比赛Rating、通过题目 */}
        <section>
          <div className="grid gap-6 md:grid-cols-3">
            {/* 学生信息 */}
            <div className="rounded-md border border-ui bg-panel p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-panel-strong text-lg font-semibold">
                  {avatarText}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">{displayName}</h1>
                  <p className="text-sm text-muted">@{userName}</p>
                </div>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between border-b border-ui pb-2">
                  <dt className="text-muted">用户名</dt>
                  <dd>{userName}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-ui pb-2">
                  <dt className="text-muted">注册时间</dt>
                  <dd className="tabular-nums">
                    {formatDateTime(user.createdAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">提交总数</dt>
                  <dd className="tabular-nums">{user._count.submissions}</dd>
                </div>
              </dl>
            </div>

            {/* 比赛 Rating */}
            <div className="rounded-md border border-ui bg-panel p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Trophy className="h-4 w-4" />
                比赛 Rating
              </div>
              <p
                className={`mt-3 text-4xl font-semibold tabular-nums ${ratingInfo.className}`}
              >
                {rating}
              </p>
              <p className={`mt-1 text-sm ${ratingInfo.className}`}>
                {ratingInfo.level}
              </p>
            </div>

            {/* 通过题目 */}
            <div className="rounded-md border border-ui bg-panel p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4" />
                通过题目
              </div>
              {solvedProblems.length === 0 ? (
                <p className="mt-3 text-sm text-muted">暂未通过题目。</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {solvedProblems.slice(0, 5).map((problem) => (
                    <li
                      key={problem.slug}
                      className="flex items-center justify-between border-b border-ui pb-2 last:border-b-0"
                    >
                      <Link
                        href={`/problems/${problem.slug}`}
                        className="max-w-[150px] truncate text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {problem.title}
                      </Link>
                      <span className="text-muted text-xs">
                        {getDifficultyText(problem.difficulty)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* 分割线（不贯通） */}
        <div className="flex justify-center">
          <div className="w-32 h-px bg-border" />
        </div>

        {/* 第二行：4个指标卡片 */}
        <section>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border border-ui bg-panel p-4">
              <p className="text-sm text-muted">完成题目数</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {solvedCount}
              </p>
              <p className="mt-2 text-xs text-muted">
                本周 {formatWeeklyDelta(solvedWeeklyDelta, " 题")}
              </p>
            </div>
            <div className="rounded-md border border-ui bg-panel p-4">
              <p className="text-sm text-muted">掌握知识点数量</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {knowledgePoints}
              </p>
              <p className="mt-2 text-xs text-muted">
                本周 {formatWeeklyDelta(knowledgeWeeklyDelta, " 点")}
              </p>
            </div>
            <div className="rounded-md border border-ui bg-panel p-4">
              <p className="text-sm text-muted">AI 辅导轮次</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {aiRounds}
              </p>
              <p className="mt-2 text-xs text-muted">
                本周 {formatWeeklyDelta(aiWeeklyDelta, " 轮")}
              </p>
            </div>
            {/* 薄弱模块 - 用方块卡片显示3个关键模块 */}
            <div className="rounded-md border border-ui bg-panel p-4">
              <p className="text-sm text-muted">薄弱模块</p>
              <div className="mt-2 space-y-2">
                {weakModules.slice(0, 3).map((module, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded px-2 py-1 bg-panel-strong text-xs"
                  >
                    <span className="font-medium">{module.topic}</span>
                    <span className="text-muted">
                      {Math.round((module.passRate * 100))}%
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                本周 {formatWeeklyDelta(weakWeeklyDelta, " 个")}
              </p>
            </div>
          </div>
        </section>

        {/* 分割线（不贯通） */}
        <div className="flex justify-center">
          <div className="w-32 h-px bg-border" />
        </div>

        {/* 第三行：AI 评语 */}
        <section>
          {isOwner ? (
            <form action={refreshWeeklyAiSummary}>
              <input type="hidden" name="userId" value={id} />
              <div className="rounded-md border border-zinc-300 bg-zinc-50 text-sm text-zinc-800 shadow-[0_10px_24px_rgba(0,0,0,0.08)] transition-colors duration-300 ease-out dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-2 text-xs text-zinc-500 transition-colors duration-300 ease-out dark:border-zinc-800 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-400" />
                    <span className="h-2 w-2 rounded-full bg-yellow-400" />
                    <span className="h-2 w-2 rounded-full bg-green-400" />
                    <span className="ml-2 font-mono">AI 评语</span>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-200 bg-white px-3 text-xs text-zinc-600 transition-colors duration-300 ease-out hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    aria-label="刷新本周 AI 评语"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    刷新
                  </button>
                </div>
                <div className="px-4 py-3 font-mono text-[13px] leading-7 transition-colors duration-300 ease-out">
                  <p className="text-emerald-700 dark:text-emerald-300">
                    $ analyze --scope weekly --provider {user.aiProvider}{" "}
                    --model {user.aiModel}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">
                    {aiSummary}
                  </p>
                  <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                    最近刷新：{aiSummaryUpdatedText}
                  </p>
                </div>
              </div>
            </form>
          ) : null}
        </section>

        {/* 合并：提交热力图 与 最近提交记录（同一行，响应式在小屏堆叠） */}
        <section>
          <div className="grid gap-6 md:grid-cols-2">
            <HeatmapSection
              heatMonthSegments={heatMonthSegments}
              heatWeeks={heatWeeks}
              maxHeatCount={maxHeatCount}
            />

            <div className="rounded-md border border-ui bg-panel p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="h-4 w-4" />
                最近提交记录
              </div>
              <div className="mt-3 w-full overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-ui bg-panel-strong text-left">
                      <th className="h-10 px-3">题目</th>
                      <th className="h-10 px-3">状态</th>
                      <th className="h-10 px-3">分数</th>
                      <th className="h-10 px-3">提交时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubmissions.length === 0 ? (
                      <tr className="border-b border-ui">
                        <td
                          colSpan={4}
                          className="px-3 py-8 text-center text-muted"
                        >
                          暂无提交记录。
                        </td>
                      </tr>
                    ) : (
                      recentSubmissions.map((submission) => (
                        <tr key={submission.id} className="border-b border-ui">
                          <td className="h-11 px-3">
                            <Link
                              href={`/problems/${submission.problem.slug}`}
                              className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {submission.problem.title}
                            </Link>
                          </td>
                          <td className="h-11 px-3">
                            {submission.status === "ACCEPTED" ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                通过
                              </span>
                            ) : (
                              <span className="text-muted">
                                {submission.status}
                              </span>
                            )}
                          </td>
                          <td className="h-11 px-3 tabular-nums">
                            {submission.score}
                          </td>
                          <td className="h-11 px-3 tabular-nums text-muted">
                            {formatDateTime(submission.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* 第六行：参加比赛记录 */}
        <section>
          <div className="rounded-md border border-ui bg-panel p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BrainCircuit className="h-4 w-4" />
              参加比赛记录
            </div>
            <div className="mt-3 w-full overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ui bg-panel-strong text-left">
                    <th className="h-10 px-3">比赛</th>
                    <th className="h-10 px-3">排名</th>
                    <th className="h-10 px-3">成绩</th>
                    <th className="h-10 px-3">日期</th>
                  </tr>
                </thead>
                <tbody>
                  {recentContestRecords.map((contest) => (
                    <tr key={contest.name} className="border-b border-ui">
                      <td className="h-11 px-3">{contest.name}</td>
                      <td className="h-11 px-3 tabular-nums">
                        {contest.rank}
                      </td>
                      <td className="h-11 px-3">{contest.performance}</td>
                      <td className="h-11 px-3 tabular-nums text-muted">
                        {contest.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
