"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";

const getStatusLabel = (status: string) => {
  switch (status) {
    case "NOT_STARTED":
      return "未开始";
    case "IN_PROGRESS":
      return "进行中";
    case "ENDED":
      return "已结束";
    default:
      return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "NOT_STARTED":
      return "text-gray-500";
    case "IN_PROGRESS":
      return "text-blue-500";
    case "ENDED":
      return "text-green-500";
    default:
      return "text-gray-500";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "OFFICIAL":
      return "官方比赛";
    case "TEAM_PUBLIC":
      return "团队公开赛";
    case "INDIVIDUAL_PUBLIC":
      return "个人公开赛";
    case "REPLAY":
      return "重现赛";
    default:
      return type;
  }
};

const formatDateTime = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}分钟`;
  if (mins === 0) return `${hours}小时`;
  return `${hours}小时${mins}分钟`;
};

interface ContestDetailContentProps {
  contest: any;
  problemMap: Record<string, any>;
}

export default function ContestDetailContent({
  contest,
  problemMap,
}: ContestDetailContentProps) {
  const [activeTab, setActiveTab] = useState<
    "announcement" | "problems" | "ranking"
  >("announcement");

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-12">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {/* 返回按钮 */}
          <Link
            href="/contests"
            className="mb-6 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回比赛列表
          </Link>

          {/* 顶部：比赛标题和状态 */}
          <div className="mb-8">
            <div className="flex items-baseline gap-4">
              <h1 className="text-4xl font-bold text-foreground">
                {contest.title}
              </h1>
              <span
                className={`text-sm font-medium ${getStatusColor(contest.status)}`}
              >
                {getStatusLabel(contest.status)}
              </span>
            </div>
          </div>

          {/* 分割线 */}
          <div className="mb-8 h-px bg-ui"></div>

          {/* 基本信息展示区域 */}
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs font-medium text-muted uppercase tracking-wide">
                开始时间
              </div>
              <div className="mt-2 text-sm text-foreground">
                {formatDateTime(new Date(contest.startTime))}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted uppercase tracking-wide">
                结束时间
              </div>
              <div className="mt-2 text-sm text-foreground">
                {formatDateTime(new Date(contest.endTime))}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted uppercase tracking-wide">
                时长
              </div>
              <div className="mt-2 text-sm text-foreground">
                {formatDuration(contest.duration)}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted uppercase tracking-wide">
                参赛人数
              </div>
              <div className="mt-2 text-sm text-foreground">
                {contest.participantCount}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted uppercase tracking-wide">
                比赛类型
              </div>
              <div className="mt-2 text-sm text-foreground">
                {getTypeLabel(contest.type)}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted uppercase tracking-wide">
                比赛赛制
              </div>
              <div className="mt-2 text-sm text-foreground">
                {contest.format}
              </div>
            </div>
          </div>

          {/* 分割线 */}
          <div className="mb-8 h-px bg-ui"></div>

          {/* 标签页选项 */}
          <div className="mb-8 flex gap-8 border-b border-ui">
            <button
              onClick={() => setActiveTab("announcement")}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === "announcement"
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              比赛说明
            </button>
            <button
              onClick={() => setActiveTab("problems")}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === "problems"
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              题目列表
            </button>
            <button
              onClick={() => setActiveTab("ranking")}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === "ranking"
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              排行榜
            </button>
          </div>

          {/* 内容区域 */}
          <div className="space-y-6">
            {/* 比赛说明标签页 - 支持 Markdown */}
            {activeTab === "announcement" && contest.announcement && (
              <div className="text-sm leading-relaxed text-foreground space-y-4">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="text-xl font-bold mt-3 mb-2" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="text-lg font-bold mt-2 mb-1" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="mb-2" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul
                        className="list-disc list-inside space-y-1 mb-2"
                        {...props}
                      />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol
                        className="list-decimal list-inside space-y-1 mb-2"
                        {...props}
                      />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="mb-1" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="border-l-4 border-primary pl-4 italic opacity-75 my-2"
                        {...props}
                      />
                    ),
                    code: ({ node, inline, ...props }: any) =>
                      inline ? (
                        <code
                          className="bg-panel px-1.5 py-0.5 rounded text-xs font-mono"
                          {...props}
                        />
                      ) : (
                        <code
                          className="block bg-panel p-3 rounded my-2 overflow-x-auto"
                          {...props}
                        />
                      ),
                  }}
                >
                  {contest.announcement}
                </ReactMarkdown>
              </div>
            )}

            {/* 题目列表标签页 */}
            {activeTab === "problems" && (
              <div className="space-y-4">
                <div className="divide-y divide-ui border-b border-ui">
                  {contest.problems.map((problem: any) => {
                    const problemInfo = problemMap[problem.problemId];
                    return (
                      <div
                        key={problem.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-panel transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted">
                              {problem.number}
                            </span>
                            <Link
                              href={`/problems/${problemInfo?.slug || problem.problemId}`}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {problemInfo?.title || "未知题目"}
                            </Link>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-foreground">
                          {problem.fullScore} 分
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 排行榜标签页 */}
            {activeTab === "ranking" && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ui">
                        <th className="px-4 py-3 text-left font-medium text-muted">
                          排名
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted">
                          用户
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-muted">
                          总分
                        </th>
                        {contest.format === "ICPC" && (
                          <th className="px-4 py-3 text-center font-medium text-muted">
                            罚时
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {contest.ranking.map((entry: any) => (
                        <tr
                          key={entry.id}
                          className="border-b border-ui hover:bg-panel transition-colors"
                        >
                          <td className="px-4 py-3 text-foreground font-medium">
                            {entry.rank}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/users/${entry.userId}`}
                              className="text-primary hover:underline"
                            >
                              {entry.username}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-center text-foreground font-medium">
                            {entry.totalScore}
                          </td>
                          {contest.format === "ICPC" && (
                            <td className="px-4 py-3 text-center text-foreground">
                              {entry.penalty}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
