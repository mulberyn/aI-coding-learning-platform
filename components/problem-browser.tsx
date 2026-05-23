"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Search, Star, X } from "lucide-react";
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
  acceptanceRate: number;
  solvedCount: number;
  attemptCount: number;
};

type AttemptState = "UNTRIED" | "ATTEMPTED" | "SOLVED";

type ProblemBrowserProps = {
  problems: ProblemCatalogItem[];
  userId?: string | null;
  attemptMap?: Record<string, AttemptState>;
};

function getSolvedCount(solvedCount: number) {
  return solvedCount;
}

function getProblemTypeLabel(problemType: ProblemCatalogItem["type"]) {
  return problemType === "TRADITIONAL" ? "算法题" : "选择题";
}

export function ProblemBrowser({
  problems,
  userId,
  attemptMap = {},
}: ProblemBrowserProps) {
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [showTags, setShowTags] = useState(true);
  const [problemCategoryFilter, setProblemCategoryFilter] = useState<
    "all" | "TRADITIONAL" | "FUNCTIONAL"
  >("TRADITIONAL");
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
        problemCategoryFilter === "all" ||
        problem.type === problemCategoryFilter;
      const matchesSearch =
        !normalizedSearch ||
        [problem.title, problem.topic, problem.source, problem.statement]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesTopic && matchesType && matchesSearch;
    });
  }, [problems, problemCategoryFilter, search, topicFilter, favoriteIds]);

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
    "64px 80px minmax(260px,1.45fr) minmax(180px,1fr) 96px 94px 72px 86px";
  return (
    <div className="relative min-h-screen flex flex-col lg:block">
      <aside className="w-full border-b border-ui bg-panel-strong/50 px-3 py-8 lg:absolute lg:inset-y-0 lg:left-0 lg:z-10 lg:w-[280px] lg:border-b-0 lg:border-r lg:px-3">
        <section>
          <h3 className="mb-4 text-base font-semibold">题目分类</h3>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setProblemCategoryFilter("TRADITIONAL")}
              className={`flex w-full items-center justify-between rounded-md border px-4 py-2.5 text-left text-base transition ${
                problemCategoryFilter === "TRADITIONAL"
                  ? "border-ui bg-panel font-medium text-current"
                  : "border-transparent bg-transparent text-muted hover:text-current"
              }`}
            >
              <span>算法题</span>
              <span className="text-sm text-muted">
                {
                  problems.filter((problem) => problem.type === "TRADITIONAL")
                    .length
                }
              </span>
            </button>

            <button
              type="button"
              onClick={() => setProblemCategoryFilter("FUNCTIONAL")}
              className={`flex w-full items-center justify-between rounded-md border px-4 py-2.5 text-left text-base transition ${
                problemCategoryFilter === "FUNCTIONAL"
                  ? "border-ui bg-panel font-medium text-current"
                  : "border-transparent bg-transparent text-muted hover:text-current"
              }`}
            >
              <span>选择题</span>
              <span className="text-sm text-muted">
                {
                  problems.filter((problem) => problem.type === "FUNCTIONAL")
                    .length
                }
              </span>
            </button>
          </div>
        </section>
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
                    <span>显示知识点</span>
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
                className="grid min-w-[1040px] items-center border-b border-ui bg-panel-strong px-3 text-sm font-semibold"
                style={{
                  gridTemplateColumns: tableColumns,
                }}
              >
                <div className="flex h-10 items-center justify-center">
                  状态
                </div>
                <div className="flex h-10 items-center pl-3">题号</div>
                <div className="flex h-10 items-center">题目名称</div>
                <div className="flex h-10 items-center justify-center">
                  知识点
                </div>
                <div className="flex h-10 items-center justify-center">
                  题目类型
                </div>
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
                        className="grid min-w-[1040px] items-center border-b border-ui px-3 text-sm transition hover:bg-panel-strong/60"
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

                        <div className="flex h-10 items-center justify-center text-xs font-medium text-muted">
                          {showTags ? (
                            <span className="truncate">{problem.topic}</span>
                          ) : null}
                        </div>

                        <div className="flex h-10 items-center justify-center text-xs font-medium text-muted">
                          {getProblemTypeLabel(problem.type)}
                        </div>

                        <div className="flex h-10 items-center justify-center pr-1 font-medium">
                          {getSolvedCount(problem.solvedCount)}
                        </div>
                        <div className="flex h-10 items-center justify-end pr-1 font-medium">
                          {difficulty}
                        </div>
                        <div className="flex h-10 items-center justify-end pr-1 font-medium">
                          {Math.round(problem.acceptanceRate * 100)}%
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
