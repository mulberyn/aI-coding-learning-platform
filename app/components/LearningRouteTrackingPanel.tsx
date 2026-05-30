"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

function getQualityScore(params: {
  progress: LearningRouteProgress | null;
  tracking: LearningRouteTracking | null | undefined;
}) {
  const { progress, tracking } = params;
  if (tracking && typeof tracking.qualityScore === "number") {
    return tracking.qualityScore;
  }

  if (!progress || progress.totalPoints <= 0) {
    return 0;
  }

  const completionRate = progress.completedPoints / progress.totalPoints;
  return Math.max(0, Math.min(100, Math.round(60 + completionRate * 30)));
}

function NextRouteComposer({
  defaultPrompt,
  routeName,
}: {
  defaultPrompt: string;
  routeName: string;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPrompt(defaultPrompt);
  }, [defaultPrompt]);

  const handleGenerateNextRoute = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const recommendResponse = await fetch("/api/learning-routes/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: prompt }),
      });

      const recommendPayload = (await recommendResponse.json()) as {
        generated?: {
          routeName: string;
          summary: string;
          points: Array<{
            title: string;
            description: string;
            pointType: "problem" | "contest" | "forum" | "custom";
            refId?: string | null;
            targetDate?: string | null;
            status?: "pending" | "in_progress" | "done";
          }>;
        };
        error?: string;
      };

      if (!recommendResponse.ok || !recommendPayload.generated) {
        throw new Error(recommendPayload.error ?? "生成下一条学习路径失败");
      }

      const saveResponse = await fetch("/api/learning-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "ai",
          inputPrompt: prompt,
          generated: recommendPayload.generated,
        }),
      });

      const savePayload = (await saveResponse.json()) as { error?: string };

      if (!saveResponse.ok) {
        throw new Error(savePayload.error ?? "保存下一条学习路径失败");
      }

      setMessage(`已生成并保存“${recommendPayload.generated.routeName}”。`);
      router.push("/learn/route");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "生成下一条学习路径失败",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-md border border-ui bg-panel-strong/40 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">下一条学习路径</p>
          <p className="mt-1 text-xs text-muted">
            可以直接编辑提示词，再生成新的学习路线。
          </p>
        </div>
        <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
      </div>

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={5}
        className="mt-3 w-full rounded-md border border-ui bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/35"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">来源：{routeName}</p>
        <button
          type="button"
          onClick={handleGenerateNextRoute}
          disabled={loading || prompt.trim().length === 0}
          className="inline-flex items-center gap-2 rounded-md bg-[#dbeafe] px-3 py-1.5 text-sm font-medium text-[#1d4ed8] transition hover:bg-[#bfdbfe] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          生成并保存
        </button>
      </div>

      {message ? <p className="mt-2 text-xs text-muted">{message}</p> : null}
    </section>
  );
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

  return tracking.studySummary || tracking.summary;
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
  const detailHref = `/learn/route/${routeId}/tracking` as never;
  const statusText = buildStatusText({ tracking, progress });
  const isComplete = progress?.isComplete ?? false;
  const qualityScore = getQualityScore({ progress, tracking });
  const summaryText = tracking?.studySummary || tracking?.summary || statusText;
  const nextRoutePrompt =
    tracking?.nextRoutePrompt ||
    `请根据当前已完成的学习路线 ${routeName}，生成一条新的可编辑学习路径，重点补足薄弱模块并加入题目、比赛和复盘节点。`;

  if (mode === "summary") {
    return (
      <section className="mt-4 rounded-md border border-ui bg-panel-strong/40 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {isComplete ? "学习情况总结" : "学习情况追踪"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {isComplete
                ? "当前路线已经完成，系统会根据完成质量、代码抽查和完成时间自动给出总结。"
                : "完成题目、比赛或讨论后会自动刷新分析和建议。"}
            </p>
          </div>
          <StatusPill
            tracking={tracking}
            isRefreshing={isRefreshing}
            progress={progress}
          />
        </div>

        <p className="mt-3 text-sm text-muted">{summaryText}</p>

        {isComplete ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-ui bg-panel px-3 py-2">
              <p className="text-xs text-muted">学习质量评分</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {qualityScore} 分
              </p>
            </div>
            <div className="rounded-md border border-ui bg-panel px-3 py-2">
              <p className="text-xs text-muted">完成时间</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {tracking ? formatTrackingTime(tracking.updatedAt) : "-"}
              </p>
            </div>
            <div className="rounded-md border border-ui bg-panel px-3 py-2">
              <p className="text-xs text-muted">学习总结</p>
              <p className="mt-1 line-clamp-2 text-sm text-foreground">
                {tracking?.studySummary || tracking?.summary || "-"}
              </p>
            </div>
          </div>
        ) : null}

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
            {isComplete ? "学习情况总结" : "学习情况详情"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {routeName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isComplete
              ? "这里展示该学习路线的学习质量评分、代码抽查、完成时间和下一步建议。"
              : "这里展示该学习路线的完成情况、模型分析和后续建议。"}
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
              {progress.problemNodeComplete ? "已完成" : "未完成"}
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
              <p className="text-sm font-medium">
                {isComplete ? "学习总结" : "当前结论"}
              </p>
              <p className="mt-1 text-sm text-muted">{summaryText}</p>
              {isComplete ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md border border-ui bg-panel px-3 py-2">
                    <p className="text-xs text-muted">学习质量评分</p>
                    <p className="mt-1 text-lg font-semibold">
                      {qualityScore} 分
                    </p>
                  </div>
                  <div className="rounded-md border border-ui bg-panel px-3 py-2">
                    <p className="text-xs text-muted">完成时间</p>
                    <p className="mt-1 text-sm font-medium">
                      {formatTrackingTime(tracking.updatedAt)}
                    </p>
                  </div>
                  <div className="rounded-md border border-ui bg-panel px-3 py-2">
                    <p className="text-xs text-muted">下一步建议</p>
                    <p className="mt-1 line-clamp-2 text-sm text-foreground">
                      {tracking.suggestions[0]?.reason ||
                        "继续推进新的学习路径。"}
                    </p>
                  </div>
                </div>
              ) : null}
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

            {isComplete ? (
              <NextRouteComposer
                defaultPrompt={nextRoutePrompt}
                routeName={routeName}
              />
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
