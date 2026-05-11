import Link from "next/link";
import { ContestStatus, ForumBoard } from "@prisma/client";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  MessageSquareMore,
  Trophy,
  Users,
} from "lucide-react";
import { auth, signOut } from "@/auth";
import { HomeCheckInCalendar } from "@/app/components/HomeCheckInCalendar";
import { TopNavBar } from "@/app/components/TopNavBar";
import { appRoutes } from "@/lib/route";
import { prisma } from "@/lib/prisma";
import { FORUM_BOARD_LABEL_MAP } from "@/lib/forum";

const ICPC_STATION_NAME = "ICPC 济南站";
const ICPC_STATION_DATE = new Date("2026-11-27T00:00:00");

function formatDateTime(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function formatContestDuration(durationMinutes: number) {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) {
    return `${minutes} 分钟`;
  }

  if (minutes === 0) {
    return `${hours} 小时`;
  }

  return `${hours} 小时 ${minutes} 分钟`;
}

function getContestStatusLabel(status: ContestStatus) {
  switch (status) {
    case ContestStatus.NOT_STARTED:
      return "未开始";
    case ContestStatus.IN_PROGRESS:
      return "进行中";
    case ContestStatus.ENDED:
      return "已结束";
    default:
      return status;
  }
}

function getContestStatusClass(status: ContestStatus) {
  switch (status) {
    case ContestStatus.NOT_STARTED:
      return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case ContestStatus.IN_PROGRESS:
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case ContestStatus.ENDED:
      return "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300";
    default:
      return "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300";
  }
}

async function loadHomeForumPosts() {
  return prisma.forumPost.findMany({
    where: { board: ForumBoard.SITE },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 5,
    include: {
      user: {
        select: { name: true },
      },
      problem: {
        select: { problemNumber: true },
      },
      _count: {
        select: { comments: true },
      },
    },
  });
}

async function loadHomeContests() {
  return prisma.contest.findMany({
    where: {
      status: {
        in: [ContestStatus.NOT_STARTED, ContestStatus.IN_PROGRESS],
      },
    },
    orderBy: [{ startTime: "asc" }],
    take: 2,
  });
}

export default async function HomePage() {
  const session = await auth();
  const [forumPosts, contests] = await Promise.all([
    loadHomeForumPosts(),
    loadHomeContests(),
  ]);

  async function handleSignOut(_formData: FormData) {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const today = new Date();
  const todayIso = today.toISOString();
  const countdownDays = Math.max(
    0,
    Math.ceil(
      (ICPC_STATION_DATE.getTime() - today.setHours(0, 0, 0, 0)) /
        (1000 * 60 * 60 * 24),
    ),
  );
  const contestDateLabel = formatDateTime(ICPC_STATION_DATE).slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <TopNavBar
        routes={appRoutes}
        signedIn={Boolean(session?.user)}
        userId={session?.user?.id}
        userName={session?.user?.name}
        onSignOut={session?.user ? handleSignOut : undefined}
      />

      <main className="pt-16">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <section className="grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
            <div className="rounded-[22px] border border-ui bg-panel/95 px-6 py-7 sm:px-8">
              <p className="text-xs font-medium uppercase tracking-[0.36em] text-muted">
                AIOJ · 在线编程学习平台
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  欢迎来到 AIOJ！
                </h1>
                {session?.user?.name ? (
                  <span className="rounded-full border border-ui bg-panel-strong px-3 py-1 text-sm text-muted">
                    {session.user.name}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 max-w-3xl text-base leading-8 text-muted sm:text-[1.03rem]">
                AIOJ
                是一个在线编程学习平台，提供丰富的题库、比赛和学习资源，帮助你提升编程能力。
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                {session?.user ? (
                  <Link
                    href="#checkin-calendar"
                    className="inline-flex items-center gap-2 rounded-[10px] bg-[#dbeafe] px-4 py-2.5 text-sm font-medium text-[#1d4ed8] transition hover:bg-[#bfdbfe]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    去打卡
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-[10px] bg-[#e5e7eb] px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#d1d5db]"
                  >
                    登录后打卡
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                <Link
                  href="/problems"
                  className="inline-flex items-center gap-2 rounded-[10px] border border-ui bg-panel-strong px-4 py-2.5 text-sm font-medium transition hover:bg-panel"
                >
                  进入题库
                </Link>
                <Link
                  href="/contests"
                  className="inline-flex items-center gap-2 rounded-[10px] border border-ui bg-panel-strong px-4 py-2.5 text-sm font-medium transition hover:bg-panel"
                >
                  查看比赛
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted">
                <span className="rounded-full border border-ui bg-panel-strong px-3 py-1">
                  站务精选
                </span>
                <span className="rounded-full border border-ui bg-panel-strong px-3 py-1">
                  近期比赛
                </span>
                <span className="rounded-full border border-ui bg-panel-strong px-3 py-1">
                  每日打卡
                </span>
              </div>
            </div>

            <HomeCheckInCalendar
              signedIn={Boolean(session?.user)}
              userId={session?.user?.id}
              todayIso={todayIso}
              contestName={ICPC_STATION_NAME}
              contestDateLabel={contestDateLabel}
              daysUntilContest={countdownDays}
            />
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[22px] border border-ui bg-panel/95 px-6 py-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.32em] text-muted">
                    站务版精选
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    最近的讨论帖
                  </h2>
                </div>
                <Link
                  href="/forum?board=SITE"
                  className="inline-flex items-center gap-2 rounded-[10px] border border-ui bg-panel-strong px-4 py-2 text-sm font-medium transition hover:bg-panel"
                >
                  查看更多站务帖
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-5 divide-y divide-[var(--border)] border-y border-ui">
                {forumPosts.length === 0 ? (
                  <div className="py-6 text-sm text-muted">
                    暂无站务版讨论帖
                  </div>
                ) : (
                  forumPosts.map((post) => {
                    const problemLabel = post.problem?.problemNumber
                      ? `P${String(post.problem.problemNumber).padStart(4, "0")}`
                      : "站务";

                    return (
                      <article
                        key={post.id}
                        className="flex flex-col gap-2 px-1 py-4 transition-colors hover:bg-panel-strong/50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {post.isPinned ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-300">
                                置顶
                              </span>
                            ) : null}
                            <Link
                              href={`/forum/${post.id}` as never}
                              className="truncate text-[15px] font-medium tracking-tight text-foreground transition hover:text-primary"
                            >
                              {post.title}
                            </Link>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                            <span>
                              {FORUM_BOARD_LABEL_MAP[ForumBoard.SITE]}
                            </span>
                            <span>{problemLabel}</span>
                            <span>作者 {post.user.name}</span>
                            <span>{formatDateTime(post.createdAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted">
                          <MessageSquareMore
                            className="h-3.5 w-3.5"
                            aria-hidden
                          />
                          <span>{post._count.comments} 回复</span>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-[22px] border border-ui bg-panel/95 px-6 py-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.32em] text-muted">
                    近期比赛
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    即将开始或正在进行
                  </h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-ui bg-panel-strong px-3 py-1 text-xs text-muted">
                  <Trophy className="h-3.5 w-3.5" />
                  最多展示两场
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {contests.length === 0 ? (
                  <div className="py-6 text-sm text-muted">
                    暂无即将开始或正在进行的比赛
                  </div>
                ) : (
                  contests.map((contest) => (
                    <article
                      key={contest.id}
                      className="rounded-[16px] border border-ui bg-panel px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/contests/${contest.id}` as never}
                            className="block text-[15px] font-medium tracking-tight text-foreground transition hover:text-primary"
                          >
                            {contest.title}
                          </Link>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                            <span>
                              {formatDateTime(contest.startTime)} -{" "}
                              {formatDateTime(contest.endTime)}
                            </span>
                            <span>
                              {formatContestDuration(contest.duration)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" aria-hidden />
                              {contest.participantCount} 人
                            </span>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getContestStatusClass(contest.status)}`}
                        >
                          {getContestStatusLabel(contest.status)}
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-ui pt-4 text-sm text-muted">
                <Clock3 className="h-4 w-4" />
                <span>
                  {ICPC_STATION_NAME} 还有 {countdownDays} 天
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
