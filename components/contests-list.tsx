"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Contest {
  id: string;
  title: string;
  type: string;
  format: string;
  status: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  participantCount: number;
}

interface ContestsListProps {
  contests: Contest[];
  filteredContests: Contest[];
  isLoading?: boolean;
}

export function ContestsList({
  contests,
  filteredContests,
  isLoading = false,
}: ContestsListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(filteredContests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContests = filteredContests.slice(startIndex, endIndex);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NOT_STARTED":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "ENDED":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

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
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}分钟`;
    if (mins === 0) return `${hours}小时`;
    return `${hours}小时${mins}分钟`;
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted">加载中...</div>;
  }

  if (filteredContests.length === 0) {
    return <div className="py-8 text-center text-muted">暂无比赛信息</div>;
  }

  return (
    <div className="space-y-4">
      {/* 比赛列表 */}
      <div className="divide-y divide-ui border-b border-ui">
        {paginatedContests.map((contest) => (
          <div
            key={contest.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-panel transition-colors"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground hover:text-primary cursor-pointer truncate">
                {contest.title}
              </h3>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                <span>{getTypeLabel(contest.type)}</span>
                <span>•</span>
                <span>赛制: {contest.format}</span>
              </div>
            </div>

            <div className="ml-4 flex items-center gap-6 text-sm">
              {/* 时间 */}
              <div className="hidden sm:block">
                <div className="text-foreground">
                  {formatDateTime(contest.startTime)}
                </div>
                <div className="text-xs text-muted">
                  至 {formatDateTime(contest.endTime)}
                </div>
              </div>

              {/* 时长 */}
              <div className="hidden md:block text-center text-foreground min-w-[80px]">
                {formatDuration(contest.duration)}
              </div>

              {/* 参赛人数 */}
              <div className="hidden md:block text-center text-foreground min-w-[60px]">
                <div>{contest.participantCount}</div>
                <div className="text-xs text-muted">人</div>
              </div>

              {/* 状态 */}
              <div className="min-w-[80px] text-right">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                    contest.status,
                  )}`}
                >
                  {getStatusLabel(contest.status)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-ui p-2 hover:bg-panel disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`h-8 w-8 rounded-lg border transition-colors ${
                  currentPage === page
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-ui hover:bg-panel"
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="rounded-lg border border-ui p-2 hover:bg-panel disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
