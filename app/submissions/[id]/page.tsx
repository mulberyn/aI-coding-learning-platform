import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { SubmissionLanguage, SubmissionStatus } from "@prisma/client";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";

type SubmissionDetailPageProps = {
  params: Promise<{ id: string }>;
};

const codeFontFamily =
  '"FiraCode Nerd Font Mono", "Fira Code", "JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace';

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

function escapeHtml(source: string) {
  return source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function alphaToken(index: number) {
  let current = index;
  let result = "";

  do {
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26) - 1;
  } while (current >= 0);

  return `__PH${result}__`;
}

function keywordPattern(language: SubmissionLanguage) {
  const shared = [
    "if",
    "else",
    "for",
    "while",
    "return",
    "break",
    "continue",
    "switch",
    "case",
    "default",
    "class",
    "struct",
    "public",
    "private",
    "protected",
    "static",
    "const",
    "let",
    "var",
    "fn",
    "function",
    "import",
    "from",
    "package",
  ];

  if (language === "PYTHON") {
    return [
      ...shared,
      "def",
      "in",
      "and",
      "or",
      "not",
      "lambda",
      "None",
      "True",
      "False",
    ];
  }

  if (language === "RUST") {
    return [...shared, "impl", "trait", "mut", "match", "enum", "crate"];
  }

  return [
    ...shared,
    "int",
    "long",
    "double",
    "float",
    "void",
    "new",
    "nullptr",
  ];
}

function highlightCode(source: string, language: SubmissionLanguage) {
  if (!source) {
    return "";
  }

  let work = source;
  const commentRegex = language === "PYTHON" ? /#.*$/gm : /\/\/.*$/gm;
  const stringRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/gm;
  const numberRegex = /\b\d+(?:\.\d+)?\b/g;
  const keywords = keywordPattern(language)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const keywordRegex = new RegExp(`\\b(${keywords})\\b`, "g");
  const tokenMap = new Map<string, string>();

  function stash(regex: RegExp, tokenClass: string) {
    work = work.replace(regex, (token) => {
      const key = alphaToken(tokenMap.size);
      tokenMap.set(
        key,
        `<span class=\"${tokenClass}\">${escapeHtml(token)}</span>`,
      );
      return key;
    });
  }

  stash(stringRegex, "code-token-string");
  stash(commentRegex, "code-token-comment");

  let highlighted = escapeHtml(work);

  highlighted = highlighted
    .replace(
      keywordRegex,
      (_token, group1) => `<span class=\"code-token-keyword\">${group1}</span>`,
    )
    .replace(
      numberRegex,
      (token) => `<span class=\"code-token-number\">${token}</span>`,
    );

  tokenMap.forEach((value, key) => {
    highlighted = highlighted.replaceAll(key, value);
  });

  return highlighted;
}

export default async function SubmissionDetailPage({
  params,
}: SubmissionDetailPageProps) {
  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
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

  if (!submission) {
    notFound();
  }

  const statusMeta = statusMetaMap[submission.status];
  const StatusIcon = statusMeta.icon;
  const codeHtml = highlightCode(submission.sourceCode, submission.language);

  return (
    <SiteShell requireAuth={false}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">提交详情</h1>
          <Link
            href="/submissions"
            className="rounded-md border border-ui px-3 py-2 text-sm hover:bg-panel-strong"
          >
            返回提交记录
          </Link>
        </div>

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
              <tr className="border-b border-ui">
                <td className="h-11 px-3">
                  <div className="inline-flex items-center gap-2">
                    <StatusIcon
                      className={`h-4 w-4 ${statusMeta.iconClass}`}
                      aria-hidden
                    />
                    <span>{statusMeta.label}</span>
                  </div>
                </td>
                <td className="h-11 px-3 tabular-nums">{submission.score}</td>
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
                    submission.judgeResults.map((result) => result.timeSec),
                  )}
                </td>
                <td className="h-11 px-3 tabular-nums">
                  {formatMemory(
                    submission.judgeResults.map((result) => result.memoryKb),
                  )}
                </td>
                <td className="h-11 px-3">
                  {languageLabelMap[submission.language]}
                </td>
                <td className="h-11 px-3 tabular-nums text-muted">
                  {formatDateTime(submission.createdAt)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <section className="mt-5 overflow-hidden rounded-md border border-ui bg-panel">
          <header className="border-b border-ui bg-panel-strong px-4 py-2 text-sm font-medium">
            提交代码
          </header>
          <pre
            className="m-0 overflow-x-auto px-4 py-4 text-[13px] leading-6 code-editor"
            style={{
              fontFamily: codeFontFamily,
              fontVariantLigatures: "common-ligatures contextual",
              fontFeatureSettings: '"liga" 1, "calt" 1',
              tabSize: 2,
            }}
          >
            <code dangerouslySetInnerHTML={{ __html: codeHtml || " " }} />
          </pre>
        </section>
      </div>
    </SiteShell>
  );
}
