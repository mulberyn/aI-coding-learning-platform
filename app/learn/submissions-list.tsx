"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import type { Submission, AiTutoring } from "@prisma/client";

interface SubmissionWithTutoring extends Submission {
  aiTutorings?: AiTutoring[];
}

interface LearnSubmissionsListProps {
  problemId: string;
  userId: string;
}

export function LearningSubmissionsList({
  problemId,
  userId,
}: LearnSubmissionsListProps) {
  const [submissions, setSubmissions] = useState<SubmissionWithTutoring[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tutoringLoading, setTutoringLoading] = useState<{
    [key: string]: boolean;
  }>({});
  const [tutoringContent, setTutoringContent] = useState<{
    [key: string]: string;
  }>({});

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const res = await fetch(
          `/api/learn/submissions?problemId=${problemId}`,
        );
        if (!res.ok) throw new Error("Failed to fetch submissions");
        const data = await res.json();
        setSubmissions(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch submissions",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchSubmissions();
  }, [problemId]);

  const handleTutoring = async (submissionId: string, tutoringType: string) => {
    const key = `${submissionId}-${tutoringType}`;

    // Check if tutoring already exists
    const submission = submissions.find((s) => s.id === submissionId);
    const existingTutoring = submission?.aiTutorings?.find(
      (t) => t.tutoringType === tutoringType,
    );

    if (existingTutoring) {
      setTutoringContent((prev) => ({
        ...prev,
        [key]: existingTutoring.tutoringContent,
      }));
      return;
    }

    setTutoringLoading((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await fetch("/api/learn/tutoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, tutoringType }),
      });

      if (!res.ok) throw new Error("Failed to generate tutoring");

      const data = await res.json();
      setTutoringContent((prev) => ({
        ...prev,
        [key]: data.tutoringContent,
      }));

      // Update submissions to include new tutoring
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? {
                ...s,
                aiTutorings: [...(s.aiTutorings || []), data],
              }
            : s,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get tutoring");
    } finally {
      setTutoringLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-ui bg-panel p-4 text-sm text-rose-600">
        错误：{error}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border border-ui bg-panel p-8 text-center">
        <p className="text-muted">你还没有提交过这道题</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => {
        const submissionDate = new Date(submission.createdAt).toLocaleString(
          "zh-CN",
        );
        const tutoringTypes = [
          { key: "code_analysis", label: "代码分析" },
          { key: "improvement_suggestion", label: "改进建议" },
          { key: "error_analysis", label: "错误分析" },
        ];

        return (
          <div
            key={submission.id}
            className="rounded-lg border border-ui bg-panel p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  提交 #{submission.id.slice(0, 8)}
                </p>
                <p className="text-xs text-muted">{submissionDate}</p>
              </div>
              <div className="flex gap-2">
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    submission.status === "ACCEPTED"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
                      : submission.status === "WRONG_ANSWER"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200"
                        : submission.status === "COMPILE_ERROR"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
                  }`}
                >
                  {submission.status}
                </span>
                <span className="rounded bg-panel-strong px-2 py-1 text-xs font-medium text-foreground">
                  {submission.score} 分
                </span>
              </div>
            </div>

            <div className="mb-4 max-h-48 overflow-auto rounded bg-background p-3">
              <pre className="text-xs text-muted">
                {submission.sourceCode.slice(0, 500)}
                {submission.sourceCode.length > 500 ? "..." : ""}
              </pre>
            </div>

            <div className="flex flex-wrap gap-2">
              {tutoringTypes.map(({ key, label }) => {
                const tutKey = `${submission.id}-${key}`;
                const hasTutoring = submission.aiTutorings?.some(
                  (t) => t.tutoringType === key,
                );
                const content = tutoringContent[tutKey];

                return (
                  <div key={key}>
                    <button
                      onClick={() => handleTutoring(submission.id, key)}
                      disabled={tutoringLoading[tutKey]}
                      className="flex items-center gap-2 rounded-lg border border-ui bg-blue-50 px-3 py-2 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                    >
                      {tutoringLoading[tutKey] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {hasTutoring ? `${label}（已生成）` : `${label}`}
                    </button>

                    {content && (
                      <div className="mt-2 rounded-lg border border-ui bg-background p-3">
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <p className="mb-2 text-xs font-semibold text-foreground">
                            AI {label}：
                          </p>
                          <div className="whitespace-pre-wrap text-xs text-muted">
                            {content}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
