"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Sparkles,
} from "lucide-react";
import { type LearningRouteTracking } from "@/lib/learning-route-types";

type LearningRouteProgress = {
  totalPoints: number;
  completedPoints: number;
  problemNodeComplete: boolean;
  isComplete: boolean;
};

type LearningRouteTrackingPanelProps = {
  routeId: string;
  routeName: string;
  tracking: LearningRouteTracking | null | undefined;
  progress: LearningRouteProgress | null;
  isRefreshing: boolean;
  mode: "summary" | "detail";
};

function formatTrackingTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildStatusText(params: {
  tracking: LearningRouteTracking | null | undefined;
  progress: LearningRouteProgress | null;
}) {
  const { tracking, progress } = params;

  if (!tracking && (progress?.completedPoints ?? 0) === 0) {
    return "开始你的学习之旅吧";
  }

  if (!tracking) {
    return "已有学习进展，系统正在生成该路线的评估结果。";
  }

  return tracking.summary;
}

function StatusPill({
  tracking,
  isRefreshing,
  progress,
}: {
  tracking: LearningRouteTracking | null | undefined;
  isRefreshing: boolean;
  progress: LearningRouteProgress | null;
}) {
  if (!tracking && (progress?.completedPoints ?? 0) === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-ui bg-panel px-2.5 py-1 text-xs text-muted">
        <Sparkles className="h-3.5 w-3.5" />
        开始你的学习之旅吧
      </span>
    );
  }

  if (!tracking) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-ui bg-panel px-2.5 py-1 text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        正在生成
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ui bg-panel px-2.5 py-1 text-xs text-muted">
      {isRefreshing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Clock3 className="h-3.5 w-3.5" />
      )}
      {isRefreshing
        ? "正在更新"
        : `更新时间 ${formatTrackingTime(tracking.updatedAt)}`}
    </span>
  );
}

export function LearningRouteTrackingPanel({
  routeId,
  routeName,
  tracking,
  progress,
  isRefreshing,
  mode,
}: LearningRouteTrackingPanelProps) {
  const detailHref = `/learn/route/${routeId}/tracking`;
  const statusText = buildStatusText({ tracking, progress });

  if (mode === "summary") {
    return (
      <section className="mt-4 rounded-md border border-ui bg-panel-strong/40 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">学习情况追踪</p>
            <p className="mt-1 text-xs text-muted">
              完成题目、比赛或讨论后会自动刷新分析和建议。
            </p>
          </div>
          <StatusPill
            tracking={tracking}
            isRefreshing={isRefreshing}
            progress={progress}
          />
        </div>

        <p className="mt-3 text-sm text-muted">{statusText}</p>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-ui pt-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted">当前路线</p>
            <p className="truncate text-sm font-medium">{routeName}</p>
          </div>
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1 rounded-md border border-ui bg-panel px-3 py-1.5 text-sm text-muted transition hover:bg-panel-strong hover:text-foreground"
          >
            查看详情
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-ui bg-panel px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">
            学习情况详情
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {routeName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            这里展示该学习路线的完成情况、模型分析和后续建议。
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <StatusPill
            tracking={tracking}
            isRefreshing={isRefreshing}
            progress={progress}
          />
          <Link
            href="/learn/route"
            className="inline-flex items-center gap-1 rounded-md border border-ui bg-panel-strong px-3 py-1.5 text-sm text-muted transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回学习路线
          </Link>
        </div>
      </div>

      {progress ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <div className="rounded-md border border-ui bg-panel-strong/40 px-3 py-2 text-xs text-muted">
            总学习点{" "}
            <span className="ml-1 font-medium text-foreground">
              {progress.totalPoints}
            </span>
          </div>
          <div className="rounded-md border border-ui bg-panel-strong/40 px-3 py-2 text-xs text-muted">
            已完成{" "}
            <span className="ml-1 font-medium text-foreground">
              {progress.completedPoints}
            </span>
          </div>
          <div className="rounded-md border border-ui bg-panel-strong/40 px-3 py-2 text-xs text-muted">
            题目节点{" "}
            <span className="ml-1 font-medium text-foreground">
              {progress.problemNodeComplete
                ? "已完成"
                : `${progress.solvedProblems ?? 0}/${progress.problemPointsLength ?? 0}`}
            </span>
          </div>
          <div className="rounded-md border border-ui bg-panel-strong/40 px-3 py-2 text-xs text-muted">
            路线状态{" "}
            <span
              className={`ml-1 font-medium ${progress.isComplete ? "text-emerald-600 dark:text-emerald-300" : "text-foreground"}`}
            >
              {progress.isComplete ? "已完成" : "进行中"}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {!tracking && (progress?.completedPoints ?? 0) === 0 ? (
          <p className="rounded-md border border-ui bg-panel-strong/40 px-3 py-3 text-sm text-muted">
            目前还没有开始记录学习进展。完成学习路线中的任意学习点后，这里会自动生成针对该路线的学习情况解读。
          </p>
        ) : tracking ? (
          <>
            <div className="rounded-md border border-ui bg-panel-strong/40 px-3 py-3">
              <p className="text-sm font-medium">当前结论</p>
              <p className="mt-1 text-sm text-muted">{tracking.summary}</p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-md border border-ui bg-panel-strong/40 px-3 py-3">
                <p className="text-sm font-medium">分析要点</p>
                <ul className="mt-2 space-y-2 text-sm text-muted">
                  {tracking.analysis.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border border-ui bg-panel-strong/40 px-3 py-3">
                <p className="text-sm font-medium">下一步建议</p>
                <div className="mt-2 space-y-2">
                  {tracking.suggestions.map((item, index) => (
                    <div
                      key={`${item.title}-${index}`}
                      className="rounded-sm border border-ui bg-panel px-3 py-2"
                    >
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-muted">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {tracking.snippets.length > 0 ? (
              <div className="rounded-md border border-ui bg-panel-strong/40 px-3 py-3">
                <p className="text-sm font-medium">抽查提交代码</p>
                <div className="mt-2 space-y-2">
                  {tracking.snippets.map((snippet, index) => (
                    <div
                      key={`${snippet.problemTitle}-${snippet.createdAt}-${index}`}
                      className="rounded-sm border border-ui bg-panel px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {snippet.problemTitle}
                        </p>
                        <span className="text-xs text-muted">
                          {snippet.status} ·{" "}
                          {formatTrackingTime(snippet.createdAt)}
                        </span>
                      </div>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5 text-muted">
                        {snippet.code}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="rounded-md border border-ui bg-panel-strong/40 px-3 py-3 text-sm text-muted">
            {statusText}
          </p>
        )}
      </div>
    </section>
  );
}
