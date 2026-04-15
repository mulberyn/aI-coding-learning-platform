"use client";

import { useMemo, useState } from "react";

type SubmissionStatus =
  | "QUEUED"
  | "RUNNING"
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "COMPILE_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "JUDGE_ERROR";

type SubmissionLanguage = "CPP" | "C" | "PYTHON" | "GO" | "RUST" | "JAVA";

type JudgeResult = {
  id: string;
  status: "PENDING" | "PASSED" | "FAILED" | "ERROR";
  judge0StatusId: number | null;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  timeSec: number | null;
  memoryKb: number | null;
  testCase: {
    id: string;
    sortOrder: number;
    isSample: boolean;
  };
};

type SubmissionResponse = {
  id: string;
  status: SubmissionStatus;
  score: number;
  message: string | null;
  judgeResults: JudgeResult[];
};

type ProblemSubmitPanelProps = {
  problemSlug: string;
  problemType: "FUNCTIONAL" | "TRADITIONAL";
  initialCode: string;
};

const languageOptions: Array<{ value: SubmissionLanguage; label: string }> = [
  { value: "CPP", label: "C++" },
  { value: "C", label: "C" },
  { value: "PYTHON", label: "Python" },
  { value: "GO", label: "Go" },
  { value: "RUST", label: "Rust" },
  { value: "JAVA", label: "Java" },
];

const terminalStatuses: SubmissionStatus[] = [
  "ACCEPTED",
  "WRONG_ANSWER",
  "COMPILE_ERROR",
  "RUNTIME_ERROR",
  "TIME_LIMIT_EXCEEDED",
  "JUDGE_ERROR",
];

function statusText(status: SubmissionStatus) {
  switch (status) {
    case "QUEUED":
      return "排队中";
    case "RUNNING":
      return "评测中";
    case "ACCEPTED":
      return "通过";
    case "WRONG_ANSWER":
      return "答案错误";
    case "COMPILE_ERROR":
      return "编译错误";
    case "RUNTIME_ERROR":
      return "运行错误";
    case "TIME_LIMIT_EXCEEDED":
      return "超时";
    default:
      return "评测异常";
  }
}

export function ProblemSubmitPanel({
  problemSlug,
  problemType,
  initialCode,
}: ProblemSubmitPanelProps) {
  const [language, setLanguage] = useState<SubmissionLanguage>("CPP");
  const [sourceCode, setSourceCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);

  const samplePassed = useMemo(() => {
    if (!submission) {
      return 0;
    }
    return submission.judgeResults.filter(
      (result) => result.status === "PASSED",
    ).length;
  }, [submission]);

  async function pollSubmission(submissionId: string) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("拉取评测状态失败。请稍后重试。");
      }

      const data = (await response.json()) as SubmissionResponse;
      setSubmission(data);

      if (terminalStatuses.includes(data.status)) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    throw new Error("评测轮询超时，请稍后刷新页面查看。");
  }

  async function handleSubmit() {
    if (!sourceCode.trim()) {
      setError("请先输入代码再提交。");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problemSlug,
          language,
          sourceCode,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "提交失败，请稍后重试。");
      }

      const payload = (await response.json()) as {
        submissionId: string;
      };

      await pollSubmission(payload.submissionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-ui bg-panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted" htmlFor="language-select">
          语言
        </label>
        <select
          id="language-select"
          value={language}
          onChange={(event) =>
            setLanguage(event.target.value as SubmissionLanguage)
          }
          className="rounded-xl border border-ui bg-panel px-3 py-1.5 text-sm"
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={sourceCode}
        onChange={(event) => setSourceCode(event.target.value)}
        className="h-72 w-full rounded-2xl border border-ui bg-panel-strong p-4 font-mono text-sm outline-none"
      />

      <div className="rounded-xl border border-ui bg-panel-strong p-3 text-xs text-muted">
        {problemType === "FUNCTIONAL"
          ? "当前评测采用标准输入输出，请提交完整可运行程序。"
          : "传统题支持标准输入输出评测，提交完整程序即可。"}
      </div>

      {error ? (
        <div className="rounded-xl border border-ui bg-panel-strong p-3 text-sm">
          {error}
        </div>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="btn-inverse rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "评测中..." : "提交评测"}
        </button>
      </div>

      {submission ? (
        <div className="space-y-3 rounded-2xl border border-ui bg-panel-strong p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full border border-ui px-3 py-1">
              状态: {statusText(submission.status)}
            </span>
            <span className="rounded-full border border-ui px-3 py-1">
              得分: {submission.score}
            </span>
            <span className="rounded-full border border-ui px-3 py-1">
              通过: {samplePassed}/{submission.judgeResults.length}
            </span>
          </div>

          {submission.message ? (
            <p className="text-sm text-muted">{submission.message}</p>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-ui">
            <table className="min-w-full divide-y divide-[var(--border)] text-sm">
              <thead className="bg-panel">
                <tr>
                  <th className="px-3 py-2 text-left">用例</th>
                  <th className="px-3 py-2 text-left">状态</th>
                  <th className="px-3 py-2 text-left">耗时</th>
                  <th className="px-3 py-2 text-left">内存</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-panel-strong">
                {submission.judgeResults.map((result) => (
                  <tr key={result.id}>
                    <td className="px-3 py-2">
                      #{result.testCase.sortOrder + 1}
                    </td>
                    <td className="px-3 py-2">{result.status}</td>
                    <td className="px-3 py-2">{result.timeSec ?? "-"}</td>
                    <td className="px-3 py-2">{result.memoryKb ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
