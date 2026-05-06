"use client";

import { useState } from "react";
import { ChevronDown, Zap, HardDrive, Code, Clock } from "lucide-react";

type SortOption = "fastest" | "memory" | "shortest" | "earliest";

type ProblemStatisticsProps = {
  problemId: string;
  problemSlug: string;
  totalSubmissions: number;
  totalAccepted: number;
  acceptanceRate: number;
  submissions: Array<{
    id: string;
    userId: string;
    userName: string;
    language: string;
    score: number;
    runtime?: number;
    memory?: number;
    codeLength?: number;
    createdAt: Date;
  }>;
  submissionStats: {
    accepted: number;
    wrongAnswer: number;
    runtimeError: number;
    timeoutError: number;
    compileError: number;
  };
};

export function ProblemStatistics({
  problemId,
  totalSubmissions,
  totalAccepted,
  acceptanceRate,
  submissions,
  submissionStats,
}: ProblemStatisticsProps) {
  const [sortBy, setSortBy] = useState<SortOption>("fastest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 按用户分组，每个用户选择最优秀的提交
  const userBestSubmissions = new Map<string, (typeof submissions)[0]>();
  submissions
    .filter((s) => s.score === 100)
    .forEach((submission) => {
      const existing = userBestSubmissions.get(submission.userId);
      if (!existing) {
        userBestSubmissions.set(submission.userId, submission);
      } else {
        // 比较哪个提交更优秀：首先看运行时间，然后看内存，最后看代码长度
        let isBetter = false;
        if (
          existing.runtime === undefined ||
          submission.runtime === undefined
        ) {
          isBetter =
            (submission.runtime || Infinity) < (existing.runtime || Infinity);
        } else if (existing.runtime !== submission.runtime) {
          isBetter = submission.runtime < existing.runtime;
        } else if (existing.memory !== submission.memory) {
          isBetter =
            (submission.memory || Infinity) < (existing.memory || Infinity);
        } else {
          isBetter =
            (submission.codeLength || Infinity) <
            (existing.codeLength || Infinity);
        }

        if (isBetter) {
          userBestSubmissions.set(submission.userId, submission);
        }
      }
    });

  // 排序满分提交
  const fullScoreSubmissions = Array.from(userBestSubmissions.values()).sort(
    (a, b) => {
      switch (sortBy) {
        case "fastest":
          return (a.runtime || Infinity) - (b.runtime || Infinity);
        case "memory":
          return (a.memory || Infinity) - (b.memory || Infinity);
        case "shortest":
          return (a.codeLength || Infinity) - (b.codeLength || Infinity);
        case "earliest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        default:
          return 0;
      }
    },
  );

  const totalPages = Math.ceil(fullScoreSubmissions.length / itemsPerPage);
  const paginatedSubmissions = fullScoreSubmissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // 提交分布数据
  const distributionData = [
    { name: "通过", value: submissionStats.accepted, color: "#10b981" },
    { name: "未通过", value: submissionStats.wrongAnswer, color: "#ef4444" },
    { name: "运行错误", value: submissionStats.runtimeError, color: "#f59e0b" },
    { name: "超时", value: submissionStats.timeoutError, color: "#eab308" },
    { name: "编译错误", value: submissionStats.compileError, color: "#8b5cf6" },
  ].filter((item) => item.value > 0);

  const sortOptions = [
    { value: "fastest", label: "最快", icon: Zap },
    { value: "memory", label: "最小内存", icon: HardDrive },
    { value: "shortest", label: "最短代码", icon: Code },
    { value: "earliest", label: "最早", icon: Clock },
  ] as const;

  return (
    <div className="space-y-12">
      {/* 第一行：总表统计 */}
      <section>
        <div className="border border-ui rounded-lg overflow-hidden">
          <div className="grid grid-cols-4 divide-x divide-ui">
            {[
              {
                label: "总提交数",
                value: totalSubmissions,
              },
              {
                label: "总通过数",
                value: totalAccepted,
              },
              {
                label: "通过率",
                value: `${acceptanceRate}%`,
              },
              {
                label: "满分提交",
                value: fullScoreSubmissions.length,
              },
            ].map((item, index) => (
              <div
                key={index}
                className="px-6 py-8 text-center hover:bg-panel-strong transition-colors"
              >
                <p className="text-xs font-medium text-muted mb-2">
                  {item.label}
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 第二行：满分提交 */}
      <section>
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-foreground">满分提交</h2>
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-ui bg-panel-strong text-foreground text-sm font-medium hover:bg-panel-strong transition-colors">
                {sortOptions.find((opt) => opt.value === sortBy)?.label}
                <ChevronDown className="h-4 w-4 text-muted" />
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-panel-strong border border-ui rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                {sortOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setCurrentPage(1);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        sortBy === option.value
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                          : "bg-panel-strong text-foreground hover:bg-panel"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 满分提交表格 */}
          <div className="border border-ui rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ui bg-panel-strong">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    排名
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    用户
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    语言
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    {sortBy === "fastest" && "用时"}
                    {sortBy === "memory" && "内存"}
                    {sortBy === "shortest" && "代码长度"}
                    {sortBy === "earliest" && "提交时间"}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    内存占用
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    提交时间
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubmissions.length > 0 ? (
                  paginatedSubmissions.map((submission, index) => (
                    <tr
                      key={submission.id}
                      className="border-b border-ui hover:bg-panel-strong transition-colors last:border-b-0"
                    >
                      <td className="px-4 py-3 text-foreground font-medium">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {submission.userName}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">
                        {submission.language}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {sortBy === "fastest" &&
                          `${submission.runtime || "-"}ms`}
                        {sortBy === "memory" && `${submission.memory || "-"}MB`}
                        {sortBy === "shortest" &&
                          `${submission.codeLength || "-"} 字节`}
                        {sortBy === "earliest" &&
                          new Date(submission.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {submission.memory ? `${submission.memory}MB` : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">
                        {new Date(submission.createdAt).toLocaleDateString(
                          "zh-CN",
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-muted"
                    >
                      暂无满分提交
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg border border-ui text-sm text-foreground disabled:text-muted hover:bg-panel-strong transition-colors disabled:hover:bg-transparent"
              >
                1
              </button>
              {currentPage > 3 && <span className="text-muted">...</span>}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = currentPage <= 3 ? i + 2 : currentPage + i - 2;
                return page > 1 && page < totalPages ? page : null;
              })
                .filter(Boolean)
                .map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg border text-sm transition-colors ${
                      currentPage === page
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "border-ui text-foreground hover:bg-panel-strong"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              {currentPage < totalPages - 2 && (
                <span className="text-muted">...</span>
              )}
              {totalPages > 1 && (
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-lg border border-ui text-sm text-foreground disabled:text-muted hover:bg-panel-strong transition-colors disabled:hover:bg-transparent"
                >
                  {totalPages}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 第三行：提交分布 */}
      <section>
        <div className="flex justify-center mb-6">
          <h2 className="text-2xl font-semibold text-foreground">提交分布</h2>
        </div>
        <div className="border border-ui rounded-lg p-8 bg-background">
          {distributionData.length > 0 ? (
            <div className="space-y-6">
              {/* 柱状图 */}
              <div className="flex items-end justify-around h-64 gap-4 px-4">
                {distributionData.map((item) => {
                  const percentage =
                    (item.value /
                      Math.max(...distributionData.map((i) => i.value), 1)) *
                    100;
                  return (
                    <div
                      key={item.name}
                      className="flex flex-col items-center gap-3 flex-1"
                    >
                      <div className="w-full flex items-end justify-center h-48">
                        <div
                          style={{
                            height: `${percentage}%`,
                            backgroundColor: item.color,
                          }}
                          className="w-full rounded-t-lg transition-all hover:opacity-80"
                          title={`${item.name}: ${item.value}`}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">
                          {item.name}
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 图例和统计 */}
              <div className="pt-6 border-t border-ui">
                <div className="grid grid-cols-5 gap-4">
                  {distributionData.map((item) => (
                    <div
                      key={item.name}
                      className="text-center p-4 rounded-lg bg-panel-strong"
                    >
                      <div className="flex items-center justify-center mb-2">
                        <div
                          style={{ backgroundColor: item.color }}
                          className="h-3 w-3 rounded-full"
                        />
                      </div>
                      <p className="text-xs text-muted mb-1">{item.name}</p>
                      <p className="text-lg font-semibold text-foreground">
                        {item.value}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {Math.round((item.value / totalSubmissions) * 100)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted">
              暂无提交数据
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
