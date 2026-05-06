"use client";

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

interface OngoingContestsProps {
  contests: Contest[];
}

export function OngoingContests({ contests }: OngoingContestsProps) {
  const ongoingContests = contests.filter(
    (contest) => contest.status === "IN_PROGRESS",
  );

  if (ongoingContests.length === 0) {
    return null;
  }

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

  return (
    <div className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-foreground">
        进行中的比赛
      </h2>
      <div className="divide-y divide-ui border border-ui rounded-lg overflow-hidden">
        {ongoingContests.map((contest) => (
          <div
            key={contest.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-panel-strong transition-colors"
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
                <span className="inline-block rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  进行中
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
