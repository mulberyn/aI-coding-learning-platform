"use client";

import { Clock, Zap, Code } from "lucide-react";

type SubmissionHistoryProps = {
  problemId: string;
};

export function SubmissionHistory({ problemId }: SubmissionHistoryProps) {
  // 示例数据
  const submissions = [
    {
      id: "1",
      time: "2 小时前",
      result: "通过",
      runtime: "45ms",
      memory: "12.5MB",
      language: "C++",
    },
    {
      id: "2",
      time: "3 小时前",
      result: "错误答案",
      runtime: "50ms",
      memory: "12.3MB",
      language: "C++",
    },
    {
      id: "3",
      time: "5 小时前",
      result: "编译错误",
      runtime: "-",
      memory: "-",
      language: "Python",
    },
  ];

  return (
    <div className="space-y-3">
      {submissions.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">暂无提交记录</p>
      ) : (
        submissions.map((submission) => (
          <div
            key={submission.id}
            className="border border-ui rounded-lg p-3 space-y-2 hover:bg-panel-strong transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {submission.language}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded font-medium ${
                  submission.result === "通过"
                    ? "bg-green-100/30 text-green-700"
                    : submission.result === "错误答案"
                      ? "bg-red-100/30 text-red-700"
                      : "bg-yellow-100/30 text-yellow-700"
                }`}
              >
                {submission.result}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-muted">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {submission.time}
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {submission.runtime}
              </div>
              <div className="flex items-center gap-1">
                <Code className="h-3 w-3" />
                {submission.memory}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
