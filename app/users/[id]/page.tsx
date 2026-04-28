import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { BarChart3, BrainCircuit, Flame, Target, Trophy } from "lucide-react";

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
  const recentSubmissions = allSubmissions.slice(0, 20);
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

  const acceptedCount = allSubmissions.filter(
    (submission) => submission.status === "ACCEPTED",
  ).length;
  const rating = Math.min(3200, 800 + solvedCount * 28 + acceptedCount * 2);
  const ratingInfo = getRatingInfo(rating);

  const today = new Date();
  const heatDays: Array<{ dayKey: string; date: Date; count: number }> = [];
  for (let i = 83; i >= 0; i -= 1) {
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

  const monthLabels = heatWeeks.map((week, index) => {
    const month = week[0].date.getMonth();
    const prevMonth = index > 0 ? heatWeeks[index - 1][0].date.getMonth() : -1;
    return month !== prevMonth ? `${month + 1}月` : "";
  });

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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-ui bg-panel/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)] backdrop-blur-sm dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-ui bg-panel p-4">
              <p className="text-sm text-muted">完成题目数</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {solvedCount}
              </p>
              <p className="mt-2 text-xs text-muted">
                本周 {formatWeeklyDelta(solvedWeeklyDelta, " 题")}
              </p>
            </div>
            <div className="rounded-xl border border-ui bg-panel p-4">
              <p className="text-sm text-muted">掌握知识点数量</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {knowledgePoints}
              </p>
              <p className="mt-2 text-xs text-muted">
                本周 {formatWeeklyDelta(knowledgeWeeklyDelta, " 点")}
              </p>
            </div>
            <div className="rounded-xl border border-ui bg-panel p-4">
              <p className="text-sm text-muted">AI 辅导轮次</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {aiRounds}
              </p>
              <p className="mt-2 text-xs text-muted">
                本周 {formatWeeklyDelta(aiWeeklyDelta, " 轮")}
              </p>
            </div>
            <div className="rounded-xl border border-ui bg-panel p-4">
              <p className="text-sm text-muted">薄弱模块</p>
              <p className="mt-2 text-lg font-semibold leading-7">
                {weakModuleText}
              </p>
              <p className="mt-2 text-xs text-muted">
                本周 {formatWeeklyDelta(weakWeeklyDelta, " 个")}
              </p>
            </div>
          </div>

          {isOwner ? (
            <div className="mt-4 rounded-xl border border-ui bg-panel px-4 py-3 text-sm">
              <p className="font-medium">AI 评语</p>
              <p className="mt-1 leading-7 text-muted">
                你在最近阶段保持了稳定提交频率，当前通过题数为 {solvedCount}。
                {weakModules.length > 0
                  ? `建议优先补强 ${weakModuleText}，每个模块连续完成 3 道同主题题目以提升稳定性。`
                  : "当前未发现明显薄弱主题，可逐步挑战更高难度题目。"}
              </p>
            </div>
          ) : null}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-6">
            <div className="rounded-xl border border-ui bg-panel p-5">
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

            <div className="rounded-xl border border-ui bg-panel p-5">
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

            <div className="rounded-xl border border-ui bg-panel p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4" />
                通过题目
              </div>
              {solvedProblems.length === 0 ? (
                <p className="mt-3 text-sm text-muted">暂未通过题目。</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {solvedProblems.slice(0, 8).map((problem) => (
                    <li
                      key={problem.slug}
                      className="flex items-center justify-between border-b border-ui pb-2"
                    >
                      <Link
                        href={`/problems/${problem.slug}`}
                        className="max-w-[200px] truncate text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {problem.title}
                      </Link>
                      <span className="text-muted">
                        {getDifficultyText(problem.difficulty)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-ui bg-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Flame className="h-4 w-4" />
                  提交热力图
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <div className="inline-block min-w-[760px]">
                  <div className="mb-1 flex pl-8 text-[11px] text-muted">
                    {monthLabels.map((label, index) => (
                      <span
                        key={`month-${index}`}
                        className="inline-block w-[48px] text-left"
                      >
                        {label}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <div className="grid grid-rows-7 gap-[3px] pt-[1px] text-[10px] text-muted">
                      <span>一</span>
                      <span />
                      <span>三</span>
                      <span />
                      <span>五</span>
                      <span />
                      <span />
                    </div>

                    <div className="flex gap-[3px]">
                      {heatWeeks.map((week, weekIndex) => (
                        <div
                          key={`week-${weekIndex}`}
                          className="grid grid-rows-7 gap-[3px]"
                        >
                          {week.map((item) => (
                            <div
                              key={item.dayKey}
                              className={`h-[10px] w-[10px] rounded-[2px] ${getHeatColor(item.count, maxHeatCount)}`}
                              title={`${item.dayKey} · ${item.count} 次提交`}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <span>少</span>
                <span className="h-3 w-3 rounded bg-panel-strong" />
                <span className="h-3 w-3 rounded bg-emerald-200 dark:bg-emerald-900/40" />
                <span className="h-3 w-3 rounded bg-emerald-300 dark:bg-emerald-800/55" />
                <span className="h-3 w-3 rounded bg-emerald-500 dark:bg-emerald-700/80" />
                <span className="h-3 w-3 rounded bg-emerald-600 dark:bg-emerald-500" />
                <span>多</span>
              </div>
            </div>

            <div className="rounded-xl border border-ui bg-panel p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="h-4 w-4" />
                最近提交记录
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-sm">
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

            <div className="rounded-xl border border-ui bg-panel p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BrainCircuit className="h-4 w-4" />
                参加比赛记录
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
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
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
