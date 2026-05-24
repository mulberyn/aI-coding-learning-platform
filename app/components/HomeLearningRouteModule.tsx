"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Loader2, Save, Sparkles, TimerReset } from "lucide-react";
import {
  type GeneratedLearningRoute,
  type LearningRoute,
  type LearningRouteWithPoints,
} from "@/lib/learning-route-types";

function statusColor(status: "pending" | "in_progress" | "done") {
  if (status === "done") return "bg-emerald-500";
  if (status === "in_progress") return "bg-amber-400";
  return "bg-zinc-300 dark:bg-zinc-700";
}

export function HomeLearningRouteModule() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedLearningRoute | null>(
    null,
  );
  const [savedRoutes, setSavedRoutes] = useState<LearningRoute[]>([]);
  const [latestDetail, setLatestDetail] =
    useState<LearningRouteWithPoints | null>(null);

  const reloadSavedRoutes = async () => {
    const response = await fetch("/api/learning-routes", {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as {
      routes: LearningRoute[];
    };

    setSavedRoutes(payload.routes.slice(0, 4));
  };

  useEffect(() => {
    void reloadSavedRoutes();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/learning-routes/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const payload = (await response.json()) as {
        generated?: GeneratedLearningRoute;
        error?: string;
      };

      if (!response.ok || !payload.generated) {
        throw new Error(payload.error ?? "生成学习路线失败");
      }

      setGenerated(payload.generated);
      setMessage("路线草稿已生成，可点击保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
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
          inputPrompt: topic,
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

      setLatestDetail(payload.detail);
      setGenerated(null);
      setTopic("");
      setMessage("学习路线已保存，可在学习路线页和个人中心继续管理。");
      await reloadSavedRoutes();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-ui bg-panel/95 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-muted">
            AI 学习路线
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            个性化学习路线推荐
          </h2>
        </div>
        <Link
          href="/learn/route"
          className="inline-flex items-center gap-2 rounded-md border border-ui bg-panel-strong px-4 py-2 text-sm font-medium transition hover:bg-panel"
        >
          <TimerReset className="h-4 w-4" />
          打开学习路线工作台
        </Link>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <input
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="输入学习目标或知识点，例如：二分答案、并查集"
          className="h-10 rounded-md border border-ui bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500/35"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-ui bg-panel-strong px-4 text-sm font-medium transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          生成学习路线
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!generated || saving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#dbeafe] px-4 text-sm font-medium text-[#1d4ed8] transition hover:bg-[#bfdbfe] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          保存
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}

      {generated ? (
        <div className="mt-4 rounded-lg border border-ui bg-panel-strong/60 px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bot className="h-4 w-4" />
            {generated.routeName}
          </div>
          <p className="mt-1 text-sm text-muted">{generated.summary}</p>

          <div className="mt-4 space-y-3">
            {generated.points.slice(0, 6).map((point, index) => (
              <div key={`${point.title}-${index}`} className="flex gap-3">
                <div className="mt-1.5 flex w-8 flex-col items-center">
                  <span
                    className={`h-3 w-3 rounded-full ${statusColor("pending")}`}
                  />
                  {index < generated.points.length - 1 ? (
                    <span className="mt-1 h-8 w-px bg-border" />
                  ) : null}
                </div>
                <div className="flex-1 pb-1">
                  <p className="text-sm font-medium">{point.title}</p>
                  <p className="mt-1 text-xs text-muted">{point.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {(latestDetail || savedRoutes.length > 0) && (
        <div className="mt-4 rounded-lg border border-ui bg-panel-strong/40 px-4 py-3">
          <p className="text-sm font-medium">已保存学习路线</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            {(latestDetail ? [latestDetail.route, ...savedRoutes] : savedRoutes)
              .slice(0, 4)
              .map((route) => (
                <li key={route.id} className="truncate">
                  · {route.name}
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}
