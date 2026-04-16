"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Search,
  Star,
  X,
} from "lucide-react";
import { difficultyLabel } from "@/lib/problems";

export type ProblemCatalogItem = {
  id: string;
  slug: string;
  title: string;
  statement: string;
  topic: string;
  source: string;
  difficulty: keyof typeof difficultyLabel;
  type: "FUNCTIONAL" | "TRADITIONAL";
  acceptanceRate: number | null;
};

type AttemptState = "UNTRIED" | "ATTEMPTED" | "SOLVED";

type ProblemBrowserProps = {
  problems: ProblemCatalogItem[];
  userId?: string | null;
  attemptMap?: Record<string, AttemptState>;
};

function getSolvedCount(acceptanceRate: number | null) {
  return Math.round((acceptanceRate ?? 0) * 1000);
}

export function ProblemBrowser({
  problems,
  userId,
  attemptMap = {},
}: ProblemBrowserProps) {
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [showTags, setShowTags] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [problemTypeFilter, setProblemTypeFilter] = useState<
    "all" | "TRADITIONAL" | "FUNCTIONAL"
  >("all");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const storageKey = userId ? `problem-favorites:${userId}` : null;

  useEffect(() => {
    if (!storageKey) {
      setFavoriteIds([]);
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      setFavoriteIds(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setFavoriteIds([]);
    }
  }, [storageKey]);

  const topics = useMemo(() => {
    return Array.from(new Set(problems.map((problem) => problem.topic)));
  }, [problems]);

  const filteredProblems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return problems.filter((problem) => {
      const matchesTopic =
        topicFilter === "all" || problem.topic === topicFilter;
      const matchesType =
        problemTypeFilter === "all" || problem.type === problemTypeFilter;
      const matchesSearch =
        !normalizedSearch ||
        [problem.title, problem.topic, problem.source, problem.statement]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesTopic && matchesType && matchesSearch;
    });
  }, [problems, problemTypeFilter, search, topicFilter]);

  const typeCount = useMemo(() => {
    return {
      TRADITIONAL: problems.filter((problem) => problem.type === "TRADITIONAL")
        .length,
      FUNCTIONAL: problems.filter((problem) => problem.type === "FUNCTIONAL")
        .length,
    };
  }, [problems]);

  function persistFavorites(nextFavorites: string[]) {
    setFavoriteIds(nextFavorites);

    if (!storageKey) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(nextFavorites));
  }

  function toggleFavorite(problemId: string) {
    const nextFavorites = favoriteIds.includes(problemId)
      ? favoriteIds.filter((id) => id !== problemId)
      : [...favoriteIds, problemId];

    persistFavorites(nextFavorites);
  }

  function getAttemptState(problemId: string): AttemptState {
    if (!userId) {
      return "UNTRIED";
    }

    return attemptMap[problemId] ?? "UNTRIED";
  }

  function renderAttemptState(problemId: string) {
    const state = getAttemptState(problemId);

    if (state === "SOLVED") {
      return <Check className="h-4 w-4 text-emerald-600" aria-hidden />;
    }

    if (state === "ATTEMPTED") {
      return <X className="h-4 w-4 text-rose-600" aria-hidden />;
    }

    return <Minus className="h-4 w-4 text-muted" aria-hidden />;
  }

  function renderAttemptStateWithFavorite(problemId: string) {
    const isFavorited = favoriteIds.includes(problemId);
    return (
      <div className="relative flex h-4 w-10 items-center justify-center">
        <div className="absolute -left-3 flex h-5 w-5 items-center justify-center">
          {userId ? (
            <button
              type="button"
              onClick={() => toggleFavorite(problemId)}
              aria-pressed={isFavorited}
              aria-label={isFavorited ? "取消收藏" : "收藏题目"}
              className={`h-5 w-5 overflow-hidden transition ${
                isFavorited ? "text-rose-500" : "text-muted hover:text-rose-400"
              }`}
              style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
            >
              <Star className="h-5 w-5 fill-current" />
            </button>
          ) : null}
        </div>
        <div className="flex h-4 w-4 items-center justify-center">
          {renderAttemptState(problemId)}
        </div>
      </div>
    );
  }

  const tableColumns =
    "64px 80px minmax(260px,1.45fr) minmax(220px,1.2fr) 94px 72px 86px";

  return (
    <div className="relative min-h-screen flex flex-col lg:block">
      <aside
        className={`w-full border-b border-ui bg-panel-strong/50 py-8 px-3 lg:absolute lg:inset-y-0 lg:left-0 lg:z-10 lg:border-b-0 lg:border-r lg:transition-[width] lg:duration-300 lg:ease-in-out ${
          sidebarCollapsed
            ? "lg:w-[72px] lg:pl-6 lg:pr-2"
            : "lg:w-[280px] lg:px-3"
        }`}
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed((value) => !value)}
          aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
          className="absolute -right-3 top-6 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-ui bg-panel text-muted transition hover:text-current lg:flex"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden />
          )}
        </button>

        <div className={`block ${sidebarCollapsed ? "lg:hidden" : "lg:block"}`}>
          <section className="mb-8">
            <h3 className="mb-4 text-base font-semibold">题目类型</h3>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setProblemTypeFilter("TRADITIONAL")}
                className={`flex w-full items-center justify-between text-left text-base transition ${
                  problemTypeFilter === "TRADITIONAL"
                    ? "text-current font-medium"
                    : "text-muted"
                } hover:text-current`}
              >
                <span>传统题目类型</span>
                <span className="text-sm">{typeCount.TRADITIONAL}</span>
              </button>
              <button
                type="button"
                onClick={() => setProblemTypeFilter("FUNCTIONAL")}
                className={`flex w-full items-center justify-between text-left text-base transition ${
                  problemTypeFilter === "FUNCTIONAL"
                    ? "text-current font-medium"
                    : "text-muted"
                } hover:text-current`}
              >
                <span>函数式</span>
                <span className="text-sm">{typeCount.FUNCTIONAL}</span>
              </button>
              <button
                type="button"
                onClick={() => setProblemTypeFilter("all")}
                className={`flex w-full items-center justify-between text-left text-base transition ${
                  problemTypeFilter === "all"
                    ? "text-current font-medium"
                    : "text-muted"
                } hover:text-current`}
              >
                <span>全部题目</span>
              </button>
            </div>
            <div className="my-6 h-0.5 bg-gray-300/90 dark:bg-gray-600/80" />
          </section>

          <section>
            <h3 className="mb-4 text-base font-semibold">题单</h3>
            <div className="space-y-3">
              <button
                type="button"
                className="block w-full text-left text-base text-muted transition hover:text-current"
              >
                入门题单
              </button>
              <button
                type="button"
                className="block w-full text-left text-base text-muted transition hover:text-current"
              >
                算法题单
              </button>
              <button
                type="button"
                className="block w-full text-left text-base text-muted transition hover:text-current"
              >
                数据结构题单
              </button>
              <button
                type="button"
                className="block w-full text-left text-base text-muted transition hover:text-current"
              >
                我的题单 / 公开题单
              </button>
            </div>
          </section>
        </div>
      </aside>

      <section className="w-full px-4 py-8 sm:px-6 lg:px-8 lg:pl-[280px]">
        <div className="mx-auto w-full max-w-7xl">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <label
                    className="mb-2 block text-sm text-muted"
                    htmlFor="search"
                  >
                    搜索题目
                  </label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                      aria-hidden
                    />
                    <input
                      id="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="输入题目名称、标签或来源"
                      className="w-full rounded-md border border-ui bg-panel py-2.5 pl-10 pr-4 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="self-end">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showTags}
                    onClick={() => setShowTags((value) => !value)}
                    className="flex w-full items-center justify-between gap-3 border border-ui bg-panel px-4 py-2.5 text-sm transition hover:bg-panel-strong"
                  >
                    <span>显示标签</span>
                    <span
                      className={`relative h-5 w-10 rounded-full border border-ui transition ${
                        showTags ? "bg-current" : "bg-panel"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--bg)] transition ${
                          showTags ? "left-5" : "left-0.5"
                        }`}
                      />
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div
                className="grid min-w-[900px] items-center border-b border-ui bg-panel-strong px-3 text-sm font-semibold"
                style={{
                  gridTemplateColumns: tableColumns,
                }}
              >
                <div className="flex h-10 items-center justify-center">
                  状态
                </div>
                <div className="flex h-10 items-center pl-3">题号</div>
                <div className="flex h-10 items-center">题目名称</div>
                <div
                  className="flex h-10 items-center justify-end pr-2"
                  aria-hidden
                />
                <div className="flex h-10 items-center justify-center pl-1 pr-1">
                  过题人数
                </div>
                <div className="flex h-10 items-center justify-end pr-1">
                  难度
                </div>
                <div className="flex h-10 items-center justify-end pr-1">
                  通过率
                </div>
              </div>

              {filteredProblems.length === 0 ? (
                <div className="px-4 py-10 text-sm text-muted">
                  没有找到匹配的题目。
                </div>
              ) : (
                <div>
                  {filteredProblems.map((problem, index) => {
                    const difficulty = difficultyLabel[problem.difficulty];

                    return (
                      <div
                        key={problem.id}
                        className="grid min-w-[900px] items-center border-b border-ui px-3 text-sm transition hover:bg-panel-strong/60"
                        style={{
                          gridTemplateColumns: tableColumns,
                          minHeight: "2.5em",
                        }}
                      >
                        <div className="flex h-10 items-center justify-center">
                          {renderAttemptStateWithFavorite(problem.id)}
                        </div>

                        <div className="flex h-10 items-center pl-3 text-xs font-semibold tracking-[0.06em]">
                          {String(index + 1).padStart(3, "0")}
                        </div>

                        <div className="flex h-10 min-w-0 items-center pr-2">
                          <Link
                            href={`/problems/${problem.slug}`}
                            className="truncate font-medium text-blue-600 transition hover:underline dark:text-blue-400"
                          >
                            {problem.title}
                          </Link>
                        </div>

                        <div className="flex h-10 items-center justify-end gap-2 overflow-hidden whitespace-nowrap pr-2 text-xs text-muted">
                          {showTags ? (
                            <>
                              <span className="truncate">{problem.topic}</span>
                              <span>/</span>
                              <span className="truncate">{problem.source}</span>
                            </>
                          ) : null}
                        </div>

                        <div className="flex h-10 items-center justify-center pr-1 font-medium">
                          {getSolvedCount(problem.acceptanceRate)}
                        </div>
                        <div className="flex h-10 items-center justify-end pr-1 font-medium">
                          {difficulty}
                        </div>
                        <div className="flex h-10 items-center justify-end pr-1 font-medium">
                          {Math.round((problem.acceptanceRate ?? 0) * 100)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
