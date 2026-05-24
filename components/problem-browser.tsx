"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Loader2,
  Minus,
  Search,
  Sparkles,
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
  acceptanceRate: number;
  solvedCount: number;
  attemptCount: number;
};

type AttemptState = "UNTRIED" | "ATTEMPTED" | "SOLVED";

type ProblemBrowserProps = {
  problems: ProblemCatalogItem[];
  userId?: string | null;
  attemptMap?: Record<string, AttemptState>;
  knowledgePointRecommendations?: Array<{
    topic: string;
    reason: string;
  }>;
  initialTopicFilter?: string;
  showKnowledgeModule?: boolean;
};

function getProblemTypeLabel(problemType: ProblemCatalogItem["type"]) {
  return problemType === "TRADITIONAL" ? "算法题" : "选择题";
}

export function ProblemBrowser({
  problems,
  userId,
  attemptMap = {},
  knowledgePointRecommendations = [],
  initialTopicFilter = "all",
  showKnowledgeModule = true,
}: ProblemBrowserProps) {
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState(initialTopicFilter);
  const [showTags, setShowTags] = useState(true);
  const [problemCategoryFilter, setProblemCategoryFilter] = useState<
    "all" | "TRADITIONAL" | "FUNCTIONAL"
  >("TRADITIONAL");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recommendedProblems, setRecommendedProblems] = useState<
    ProblemCatalogItem[]
  >([]);
  const [recommendedTopic, setRecommendedTopic] = useState("");
  const [recommendedReason, setRecommendedReason] = useState("");
  const [loadingRecommendationTopic, setLoadingRecommendationTopic] = useState<
    string | null
  >(null);
  const [recommendationError, setRecommendationError] = useState("");
  const [selectedKnowledgePoint, setSelectedKnowledgePoint] = useState("");
  const [showAllKnowledgePoints, setShowAllKnowledgePoints] = useState(false);

  const storageKey = userId ? `problem-favorites:${userId}` : null;

  const knowledgePointOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: string[] = [];

    for (const problem of problems) {
      if (seen.has(problem.topic)) {
        continue;
      }

      seen.add(problem.topic);
      options.push(problem.topic);
    }

    return options;
  }, [problems]);

  useEffect(() => {
    setTopicFilter(initialTopicFilter);
  }, [initialTopicFilter]);

  useEffect(() => {
    const nextSelectedTopic =
      selectedKnowledgePoint &&
      knowledgePointOptions.includes(selectedKnowledgePoint)
        ? selectedKnowledgePoint
        : (knowledgePointRecommendations[0]?.topic ??
          knowledgePointOptions[0] ??
          "");

    if (nextSelectedTopic && nextSelectedTopic !== selectedKnowledgePoint) {
      setSelectedKnowledgePoint(nextSelectedTopic);
    }
  }, [
    knowledgePointOptions,
    knowledgePointRecommendations,
    selectedKnowledgePoint,
  ]);

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
  }, [problems, problemCategoryFilter, search, topicFilter]);

  const problemsBySlug = useMemo(() => {
    return new Map(problems.map((problem) => [problem.slug, problem]));
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
    "64px 80px minmax(260px,1.45fr) minmax(180px,1fr) 96px 94px 72px 86px";

  async function handleRecommendProblems(topic: string) {
    if (!userId) {
      setRecommendationError("请先登录后再使用智能推荐。");
      return;
    }

    setLoadingRecommendationTopic(topic);
    setRecommendationError("");

    try {
      const response = await fetch("/api/problems/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      });

      const data = (await response.json()) as {
        reason?: string;
        slugs?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "推荐失败");
      }

      const nextProblems = (data.slugs ?? [])
        .map((slug) => problemsBySlug.get(slug))
        .filter((problem): problem is ProblemCatalogItem => Boolean(problem));

      setRecommendedTopic(topic);
      setRecommendedReason(data.reason || "根据当前知识点推荐的题目。");
      setRecommendedProblems(nextProblems);
    } catch (error) {
      setRecommendationError(
        error instanceof Error ? error.message : "推荐失败，请稍后重试。",
      );
      setRecommendedProblems([]);
      setRecommendedTopic("");
      setRecommendedReason("");
    } finally {
      setLoadingRecommendationTopic(null);
    }
  }

  const hasKnowledgeRecommendations =
    showKnowledgeModule && knowledgePointRecommendations.length > 0;
  const activeKnowledgePoint =
    selectedKnowledgePoint || knowledgePointOptions[0] || "";
  const visibleKnowledgePoints =
    showAllKnowledgePoints || !hasKnowledgeRecommendations
      ? knowledgePointOptions
      : knowledgePointRecommendations.map((item) => item.topic);
  const showFullTable = recommendedProblems.length === 0;

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
          </div>
        </section>
      </aside>

      <section className="w-full px-4 py-8 sm:px-6 lg:px-8 lg:pl-[280px]">
        <div className="mx-auto w-full max-w-7xl">
          <div className="space-y-3">
            {initialTopicFilter !== "all" ? (
              <div className="flex items-center justify-between gap-4 rounded-sm border border-ui bg-panel px-4 py-3">
                <div>
                  <p className="text-xs text-muted">知识点题目页</p>
                  <h2 className="text-sm font-semibold text-foreground">
                    {initialTopicFilter}
                  </h2>
                </div>
                <span className="text-xs text-muted">
                  当前共 {filteredProblems.length} 题
                </span>
              </div>
            ) : null}

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
                      className="w-full rounded-sm border border-ui bg-panel py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-foreground/30"
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

            {showKnowledgeModule ? (
              <section className="overflow-hidden rounded-sm border border-ui bg-panel/60">
                <div className="flex items-center justify-between gap-4 border-b border-ui px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-sky-500" aria-hidden />
                    <h2 className="text-sm font-semibold text-foreground">
                      按照知识点筛选
                    </h2>
                  </div>
                  <p className="text-xs text-muted">
                    {hasKnowledgeRecommendations
                      ? "结合近期学习情况推荐 1-2 个知识点"
                      : "从全部知识点中选择后继续查看或推荐"}
                  </p>
                </div>

                {hasKnowledgeRecommendations ? (
                  <div className="border-b border-ui px-4 py-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          推荐知识点
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          点击标签切换知识点，再查看题目或智能推荐
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setShowAllKnowledgePoints((value) => !value)
                        }
                        className="shrink-0 rounded-full border border-ui bg-panel px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-panel-strong"
                      >
                        {showAllKnowledgePoints
                          ? "收起全部知识点"
                          : "全部知识点"}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {visibleKnowledgePoints.map((topic) => {
                        const isActive = topic === activeKnowledgePoint;
                        const reason = knowledgePointRecommendations.find(
                          (item) => item.topic === topic,
                        )?.reason;

                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => {
                              setSelectedKnowledgePoint(topic);
                              setRecommendedProblems([]);
                              setRecommendedTopic("");
                              setRecommendedReason("");
                            }}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              isActive
                                ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                                : "border-ui bg-panel text-muted hover:bg-panel-strong hover:text-foreground"
                            }`}
                            title={reason || topic}
                          >
                            <span className="max-w-[10rem] truncate">
                              {topic}
                            </span>
                            {reason ? (
                              <span className="hidden text-[11px] font-normal text-muted lg:inline">
                                · {reason}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    {showAllKnowledgePoints &&
                    knowledgePointOptions.length > 0 ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ui pt-3">
                        {knowledgePointOptions.map((topic) => {
                          const isActive = topic === activeKnowledgePoint;

                          return (
                            <button
                              key={topic}
                              type="button"
                              onClick={() => {
                                setSelectedKnowledgePoint(topic);
                                setRecommendedProblems([]);
                                setRecommendedTopic("");
                                setRecommendedReason("");
                              }}
                              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                isActive
                                  ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                                  : "border-ui bg-panel text-muted hover:bg-panel-strong hover:text-foreground"
                              }`}
                            >
                              {topic}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="border-t border-ui px-4 py-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <span className="text-xs text-muted">当前：</span>
                      {activeKnowledgePoint ? (
                        <span className="rounded-full border border-ui bg-panel px-3 py-1.5 text-xs font-medium text-foreground">
                          {activeKnowledgePoint}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">请选择知识点</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      {activeKnowledgePoint ? (
                        <Link
                          href={`/problems/topics/${encodeURIComponent(activeKnowledgePoint)}`}
                          className="inline-flex items-center justify-center gap-1 rounded-sm border border-ui bg-panel px-3 py-2 text-xs font-medium text-foreground transition hover:bg-panel-strong"
                        >
                          查看全部题目
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center justify-center gap-1 rounded-sm border border-ui bg-panel px-3 py-2 text-xs font-medium text-muted opacity-60"
                        >
                          查看全部题目
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          activeKnowledgePoint &&
                          handleRecommendProblems(activeKnowledgePoint)
                        }
                        disabled={
                          !activeKnowledgePoint ||
                          loadingRecommendationTopic === activeKnowledgePoint
                        }
                        className="inline-flex items-center justify-center gap-1 rounded-sm border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-700 transition hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:text-sky-300"
                      >
                        {loadingRecommendationTopic === activeKnowledgePoint ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        智能推荐题目
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {recommendationError ? (
              <p className="text-sm text-rose-500">{recommendationError}</p>
            ) : null}

            {showFullTable ? (
              <div className="overflow-x-auto">
                <div
                  className="grid min-w-[1040px] items-center border-b border-ui bg-panel-strong px-3 text-sm font-semibold"
                  style={{ gridTemplateColumns: tableColumns }}
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
                            {problem.solvedCount}
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
            ) : (
              <section className="overflow-hidden rounded-sm border border-ui bg-panel/60">
                <div className="flex items-center justify-between gap-4 border-b border-ui px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      {recommendedTopic || "智能推荐题目"}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {recommendedReason ||
                        "推荐题目会替代当前页的全部列表展示。"}
                    </p>
                  </div>
                  <span className="text-xs text-muted">
                    共 {recommendedProblems.length} 题
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <div
                    className="grid min-w-[1040px] items-center border-b border-ui bg-panel-strong px-3 text-sm font-semibold"
                    style={{ gridTemplateColumns: tableColumns }}
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

                  {recommendedProblems.length === 0 ? (
                    <div className="px-4 py-10 text-sm text-muted">
                      没有找到匹配的题目。
                    </div>
                  ) : (
                    <div>
                      {recommendedProblems.map((problem, index) => {
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
                                <span className="truncate">
                                  {problem.topic}
                                </span>
                              ) : null}
                            </div>

                            <div className="flex h-10 items-center justify-center text-xs font-medium text-muted">
                              算法题
                            </div>

                            <div className="flex h-10 items-center justify-center pr-1 font-medium">
                              {problem.solvedCount}
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
              </section>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
