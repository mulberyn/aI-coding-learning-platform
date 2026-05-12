"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  CalendarClock,
  Loader2,
  Route,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  type GeneratedLearningRoute,
  type LearningRoute,
  type LearningRoutePoint,
  type LearningRouteWithPoints,
} from "@/lib/learning-route-types";

type LearningRouteWorkspaceProps = {
  initialRoutes: LearningRoute[];
  initialDetail: LearningRouteWithPoints | null;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${month}-${day}`;
}

function statusLabel(status: LearningRoutePoint["status"]) {
  if (status === "done") return "已完成";
  if (status === "in_progress") return "进行中";
  return "未开始";
}

function statusClass(status: LearningRoutePoint["status"]) {
  if (status === "done") {
    return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  }

  if (status === "in_progress") {
    return "bg-amber-500/12 text-amber-700 dark:text-amber-300";
  }

  return "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300";
}

function pointTypeLabel(type: LearningRoutePoint["pointType"]) {
  if (type === "problem") return "题目";
  if (type === "contest") return "比赛";
  if (type === "forum") return "讨论";
  return "学习";
}

export function LearningRouteWorkspace({
  initialRoutes,
  initialDetail,
}: LearningRouteWorkspaceProps) {
  const [routes, setRoutes] = useState(initialRoutes);
  const [detail, setDetail] = useState(initialDetail);
  const [selectedRouteId, setSelectedRouteId] = useState(
    initialDetail?.route.id ?? initialRoutes[0]?.id ?? null,
  );
  const [topicInput, setTopicInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedLearningRoute | null>(null);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );

  const reloadList = useCallback(async (expectSelectId?: string | null) => {
    const response = await fetch("/api/learning-routes", {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("加载学习路线失败");
    }

    const payload = (await response.json()) as {
      routes: LearningRoute[];
    };

    setRoutes(payload.routes);
    if (expectSelectId) {
      setSelectedRouteId(expectSelectId);
      return;
    }

    setSelectedRouteId((prev) => prev ?? payload.routes[0]?.id ?? null);
  }, []);

  const loadDetail = useCallback(async (routeId: string) => {
    const response = await fetch(`/api/learning-routes/${routeId}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("加载学习路线详情失败");
    }

    const payload = (await response.json()) as {
      detail: LearningRouteWithPoints;
    };

    setDetail(payload.detail);
  }, []);

  useEffect(() => {
    if (!selectedRouteId) {
      setDetail(null);
      return;
    }

    void loadDetail(selectedRouteId).catch(() => {
      setMessage("学习路线详情加载失败，请稍后重试。");
    });
  }, [selectedRouteId, loadDetail]);

  const handleGenerate = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/learning-routes/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicInput }),
      });

      const payload = (await response.json()) as {
        generated?: GeneratedLearningRoute;
        error?: string;
      };

      if (!response.ok || !payload.generated) {
        throw new Error(payload.error ?? "学习路线生成失败");
      }

      setGenerated(payload.generated);
      setMessage("已生成路线草稿，确认后可保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "学习路线生成失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGenerated = async () => {
    if (!generated) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/learning-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "ai",
          inputPrompt: topicInput,
          generated,
        }),
      });

      const payload = (await response.json()) as {
        detail?: LearningRouteWithPoints;
        error?: string;
      };

      if (!response.ok || !payload.detail) {
        throw new Error(payload.error ?? "保存失败");
      }

      setGenerated(null);
      setTopicInput("");
      await reloadList(payload.detail.route.id);
      setDetail(payload.detail);
      setMessage("学习路线已保存。你可以继续在下方更新学习点状态。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存学习路线失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm("确认删除这条学习路线吗？")) {
      return;
    }

    setMessage(null);

    try {
      const response = await fetch(`/api/learning-routes/${routeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("删除失败");
      }

      await reloadList(null);
      setDetail(null);
      setMessage("学习路线已删除。");
    } catch {
      setMessage("删除学习路线失败，请稍后重试。");
    }
  };

  const updatePointStatus = async (
    pointId: string,
    status: LearningRoutePoint["status"],
  ) => {
    setMessage(null);

    try {
      const response = await fetch(`/api/learning-routes/items/${pointId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const payload = (await response.json()) as {
        detail?: LearningRouteWithPoints;
      };

      if (!response.ok || !payload.detail) {
        throw new Error("更新失败");
      }

      setDetail(payload.detail);
      setRoutes((prev) =>
        prev.map((route) =>
          route.id === payload.detail?.route.id ? payload.detail.route : route,
        ),
      );
    } catch {
      setMessage("学习点状态更新失败，请稍后重试。");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[14px] border border-ui bg-panel px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted">
              AI 学习路线推荐
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              学习路线工作台
            </h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-ui bg-panel-strong px-3 py-1 text-xs text-muted">
            <Route className="h-3.5 w-3.5" />
            列表 + 详情联动
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            value={topicInput}
            onChange={(event) => setTopicInput(event.target.value)}
            placeholder="输入学习内容或知识点，例如：动态规划、图论最短路"
            className="h-10 rounded-[10px] border border-ui bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500/35"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-ui bg-panel-strong px-4 text-sm font-medium transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            生成学习路线
          </button>
          <button
            type="button"
            onClick={handleSaveGenerated}
            disabled={saving || !generated}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#dbeafe] px-4 text-sm font-medium text-[#1d4ed8] transition hover:bg-[#bfdbfe] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpenCheck className="h-4 w-4" />}
            保存路线
          </button>
        </div>

        {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}

        {generated ? (
          <div className="mt-4 rounded-[12px] border border-ui bg-panel-strong/60 px-4 py-4">
            <p className="text-sm font-medium">草稿：{generated.routeName}</p>
            <p className="mt-1 text-sm text-muted">{generated.summary}</p>
            <ol className="mt-3 space-y-2">
              {generated.points.map((point, index) => (
                <li
                  key={`${point.title}-${index}`}
                  className="rounded-[10px] border border-ui bg-panel px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{index + 1}. {point.title}</span>
                    <span className="text-xs text-muted">{point.targetDate ?? "待定"}</span>
                  </div>
                  {point.description ? (
                    <p className="mt-1 text-xs text-muted">{point.description}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-[14px] border border-ui bg-panel px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">已保存学习路线</h2>
            <span className="text-xs text-muted">{routes.length} 条</span>
          </div>

          <div className="mt-3 space-y-2">
            {routes.length === 0 ? (
              <p className="rounded-[10px] border border-dashed border-ui px-3 py-4 text-sm text-muted">
                你还没有保存学习路线，可先在上方生成。
              </p>
            ) : (
              routes.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => setSelectedRouteId(route.id)}
                  className={`w-full rounded-[10px] border px-3 py-2 text-left transition ${
                    selectedRouteId === route.id
                      ? "border-cyan-400/60 bg-cyan-500/10"
                      : "border-ui bg-panel-strong/50 hover:bg-panel-strong"
                  }`}
                >
                  <p className="truncate text-sm font-medium">{route.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(route.generatedAt).toLocaleString("zh-CN", {
                      hour12: false,
                    })}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="rounded-[14px] border border-ui bg-panel px-4 py-4 sm:px-5 sm:py-5">
          {!detail || !selectedRoute ? (
            <p className="text-sm text-muted">选择一条学习路线后查看详情。</p>
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">
                    {detail.route.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {detail.route.summary || "按时间线推进并持续更新状态。"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteRoute(detail.route.id)}
                  className="inline-flex items-center gap-2 rounded-[10px] border border-ui bg-panel-strong px-3 py-1.5 text-sm text-muted transition hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {detail.points.map((point, index) => (
                  <article
                    key={point.id}
                    className="rounded-[12px] border border-ui bg-panel-strong/40 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-ui bg-panel px-2 text-xs">
                          {index + 1}
                        </span>
                        <p className="text-sm font-medium">{point.title}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs ${statusClass(point.status)}`}>
                          {statusLabel(point.status)}
                        </span>
                        {point.targetDate ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {formatDate(point.targetDate)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {point.description ? (
                      <p className="mt-2 text-sm text-muted">{point.description}</p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-ui bg-panel px-2 py-1 text-xs text-muted">
                        {pointTypeLabel(point.pointType)}
                      </span>
                      <button
                        type="button"
                        onClick={() => updatePointStatus(point.id, "pending")}
                        className="rounded-[8px] border border-ui bg-panel px-2.5 py-1 text-xs transition hover:bg-panel-strong"
                      >
                        设为未开始
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePointStatus(point.id, "in_progress")}
                        className="rounded-[8px] border border-ui bg-panel px-2.5 py-1 text-xs transition hover:bg-panel-strong"
                      >
                        设为进行中
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePointStatus(point.id, "done")}
                        className="rounded-[8px] bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-700 transition hover:bg-emerald-500/25 dark:text-emerald-300"
                      >
                        标记已完成
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
