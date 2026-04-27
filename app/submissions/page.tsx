import Link from "next/link";
import {
  Search,
  UserRound,
  CheckCircle2,
  XCircle,
  Clock3,
  AlertCircle,
} from "lucide-react";
import type { SubmissionLanguage, SubmissionStatus } from "@prisma/client";
import { SiteShell } from "@/components/site-shell";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SubmissionsPageProps = {
  searchParams: Promise<{
    problem?: string;
    submitter?: string;
    language?: string;
    status?: string;
    mine?: string;
    problemSlug?: string;
  }>;
};

const languageLabelMap: Record<SubmissionLanguage, string> = {
  C: "C",
  CPP: "C++",
  PYTHON: "Python",
  GO: "Go",
  RUST: "Rust",
  JAVA: "Java",
};

const statusMetaMap: Record<
  SubmissionStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    iconClass: string;
  }
> = {
  QUEUED: {
    label: "排队中",
    icon: Clock3,
    iconClass: "text-amber-500",
  },
  RUNNING: {
    label: "评测中",
    icon: Clock3,
    iconClass: "text-amber-500",
  },
  ACCEPTED: {
    label: "通过",
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
  },
  WRONG_ANSWER: {
    label: "答案错误",
    icon: XCircle,
    iconClass: "text-rose-600",
  },
  COMPILE_ERROR: {
    label: "编译错误",
    icon: AlertCircle,
    iconClass: "text-orange-600",
  },
  RUNTIME_ERROR: {
    label: "运行错误",
    icon: AlertCircle,
    iconClass: "text-orange-600",
  },
  TIME_LIMIT_EXCEEDED: {
    label: "超时",
    icon: AlertCircle,
    iconClass: "text-orange-600",
  },
  JUDGE_ERROR: {
    label: "评测错误",
    icon: AlertCircle,
    iconClass: "text-orange-600",
  },
};

const statusAliasMap: Record<SubmissionStatus, string[]> = {
  QUEUED: ["queued", "queue", "排队"],
  RUNNING: ["running", "judging", "评测中", "运行中"],
  ACCEPTED: ["accepted", "ac", "通过", "正确"],
  WRONG_ANSWER: ["wrong", "wa", "错误", "答案错误"],
  COMPILE_ERROR: ["compile", "ce", "编译"],
  RUNTIME_ERROR: ["runtime", "re", "运行错误"],
  TIME_LIMIT_EXCEEDED: ["tle", "超时", "time limit"],
  JUDGE_ERROR: ["judge", "评测错误", "系统错误"],
};

function normalizeKeyword(keyword: string) {
  return keyword.trim().toLowerCase();
}

function formatDateTime(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  const ss = `${date.getSeconds()}`.padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function formatRuntime(timeSecList: Array<number | null>) {
  const values = timeSecList.filter(
    (timeSec): timeSec is number => timeSec !== null,
  );
  if (values.length === 0) {
    return "-";
  }

  const maxMs = Math.max(...values) * 1000;
  if (maxMs < 1000) {
    return `${Math.round(maxMs)} ms`;
  }

  return `${(maxMs / 1000).toFixed(2)} s`;
}

function formatMemory(memoryKbList: Array<number | null>) {
  const values = memoryKbList.filter(
    (memoryKb): memoryKb is number => memoryKb !== null,
  );
  if (values.length === 0) {
    return "-";
  }

  const maxKb = Math.max(...values);
  if (maxKb < 1024) {
    return `${maxKb} KB`;
  }

  return `${(maxKb / 1024).toFixed(1)} MB`;
}

function matchesStatus(status: SubmissionStatus, keyword: string) {
  if (!keyword) {
    return true;
  }

  const normalized = normalizeKeyword(keyword);
  const label = normalizeKeyword(statusMetaMap[status].label);
  const aliases = statusAliasMap[status].map((item) => normalizeKeyword(item));

  return (
    normalizeKeyword(status).includes(normalized) ||
    label.includes(normalized) ||
    aliases.some((item) => item.includes(normalized))
  );
}

function matchesLanguage(language: SubmissionLanguage, keyword: string) {
  if (!keyword) {
    return true;
  }

  const normalized = normalizeKeyword(keyword);
  const label = normalizeKeyword(languageLabelMap[language]);

  return (
    normalizeKeyword(language).includes(normalized) ||
    label.includes(normalized)
  );
}

export default async function SubmissionsPage({
  searchParams,
}: SubmissionsPageProps) {
  const session = await auth();
  const params = await searchParams;

  const problemKeyword =
    params.problem?.trim() ?? params.problemSlug?.trim() ?? "";
  const submitterKeyword = params.submitter?.trim() ?? "";
  const languageKeyword = params.language?.trim() ?? "";
  const statusKeyword = params.status?.trim() ?? "";
  const sourceProblemSlug = params.problemSlug?.trim() ?? "";
  const mineOnly = params.mine === "1" && Boolean(session?.user?.id);
  const problemKeywordNumber = Number.parseInt(problemKeyword, 10);
  const isProblemNumber = !Number.isNaN(problemKeywordNumber);

  const submissions = await prisma.submission.findMany({
    where:
      mineOnly && session?.user?.id ? { userId: session.user.id } : undefined,
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      problem: {
        select: {
          slug: true,
          title: true,
          problemNumber: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      judgeResults: {
        select: {
          timeSec: true,
          memoryKb: true,
        },
      },
    },
  });

  const filteredSubmissions = submissions.filter((submission) => {
    const matchesProblem =
      !problemKeyword ||
      (isProblemNumber
        ? submission.problem.problemNumber === problemKeywordNumber
        : false) ||
      submission.problem.title
        .toLowerCase()
        .includes(problemKeyword.toLowerCase()) ||
      submission.problem.slug
        .toLowerCase()
        .includes(problemKeyword.toLowerCase());

    const matchesSubmitter =
      !submitterKeyword ||
      submission.user.name
        .toLowerCase()
        .includes(submitterKeyword.toLowerCase());

    return (
      matchesProblem &&
      matchesSubmitter &&
      matchesLanguage(submission.language, languageKeyword) &&
      matchesStatus(submission.status, statusKeyword)
    );
  });

  return (
    <SiteShell requireAuth={false}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <form
          action="/submissions"
          method="get"
          className="mb-4 grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto_auto_auto]"
        >
          {sourceProblemSlug ? (
            <input type="hidden" name="problemSlug" value={sourceProblemSlug} />
          ) : null}

          <input
            name="problem"
            defaultValue={problemKeyword}
            placeholder="题号"
            className="h-10 rounded-md border border-ui bg-panel px-3 text-sm outline-none"
          />
          <input
            name="submitter"
            defaultValue={submitterKeyword}
            placeholder="提交者"
            className="h-10 rounded-md border border-ui bg-panel px-3 text-sm outline-none"
          />
          <input
            name="language"
            defaultValue={languageKeyword}
            placeholder="语言"
            className="h-10 rounded-md border border-ui bg-panel px-3 text-sm outline-none"
          />
          <input
            name="status"
            defaultValue={statusKeyword}
            placeholder="状态"
            className="h-10 rounded-md border border-ui bg-panel px-3 text-sm outline-none"
          />

          {mineOnly ? <input type="hidden" name="mine" value="1" /> : null}

          <button
            type="submit"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-ui bg-panel-strong text-muted transition hover:text-foreground"
            aria-label="搜索提交记录"
            title="搜索"
          >
            <Search className="h-4 w-4" aria-hidden />
          </button>

          <button
            type="submit"
            name="mine"
            value={mineOnly ? "0" : "1"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-blue-200 bg-blue-100/80 text-blue-700 transition hover:bg-blue-200/80"
            aria-label={mineOnly ? "显示全部提交" : "仅看我的提交"}
            title={mineOnly ? "显示全部提交" : "仅看我的提交"}
          >
            <UserRound className="h-4 w-4" aria-hidden />
          </button>

          {sourceProblemSlug ? (
            <Link
              href={`/problems/${sourceProblemSlug}`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-ui bg-panel px-3 text-sm font-medium text-foreground transition hover:bg-panel-strong"
            >
              返回题目
            </Link>
          ) : null}
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ui bg-panel-strong text-[13px] font-semibold text-foreground">
                <th className="h-10 px-3 text-left">状态</th>
                <th className="h-10 px-3 text-left">分数</th>
                <th className="h-10 px-3 text-left">题目</th>
                <th className="h-10 px-3 text-left">提交者</th>
                <th className="h-10 px-3 text-left">用时</th>
                <th className="h-10 px-3 text-left">内存</th>
                <th className="h-10 px-3 text-left">提交语言</th>
                <th className="h-10 px-3 text-left">提交时间</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.length === 0 ? (
                <tr className="border-b border-ui">
                  <td colSpan={8} className="px-3 py-10 text-center text-muted">
                    暂无符合条件的提交记录。
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((submission) => {
                  const statusMeta = statusMetaMap[submission.status];
                  const StatusIcon = statusMeta.icon;

                  return (
                    <tr
                      key={submission.id}
                      className="border-b border-ui transition hover:bg-panel-strong/60"
                    >
                      <td className="h-11 px-3">
                        <Link
                          href={`/submissions/${submission.id}`}
                          className="inline-flex items-center gap-2 hover:underline"
                        >
                          <StatusIcon
                            className={`h-4 w-4 ${statusMeta.iconClass}`}
                            aria-hidden
                          />
                          <span>{statusMeta.label}</span>
                        </Link>
                      </td>
                      <td className="h-11 px-3 tabular-nums">
                        {submission.score}
                      </td>
                      <td className="h-11 px-3">
                        <Link
                          href={`/problems/${submission.problem.slug}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {submission.problem.problemNumber !== null
                            ? `P${submission.problem.problemNumber} ${submission.problem.title}`
                            : submission.problem.title}
                        </Link>
                      </td>
                      <td className="h-11 px-3">
                        <Link
                          href={`/users/${submission.user.id}`}
                          className="hover:underline"
                        >
                          {submission.user.name}
                        </Link>
                      </td>
                      <td className="h-11 px-3 tabular-nums">
                        {formatRuntime(
                          submission.judgeResults.map(
                            (result) => result.timeSec,
                          ),
                        )}
                      </td>
                      <td className="h-11 px-3 tabular-nums">
                        {formatMemory(
                          submission.judgeResults.map(
                            (result) => result.memoryKb,
                          ),
                        )}
                      </td>
                      <td className="h-11 px-3">
                        {languageLabelMap[submission.language]}
                      </td>
                      <td className="h-11 px-3 tabular-nums text-muted">
                        {formatDateTime(submission.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SiteShell>
  );
}
