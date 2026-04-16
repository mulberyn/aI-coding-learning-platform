"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { difficultyLabel } from "@/lib/problems";

export type ProblemCatalogItem = {
  id: string;
  slug: string;
  title: string;
  statement: string;
  topic: string;
  source: string;
  difficulty: keyof typeof difficultyLabel;
  acceptanceRate: number | null;
};

type ProblemBrowserProps = {
  problems: ProblemCatalogItem[];
  userId?: string | null;
};

function getSolvedCount(acceptanceRate: number | null) {
  return Math.round((acceptanceRate ?? 0) * 1000);
}

export function ProblemBrowser({ problems, userId }: ProblemBrowserProps) {
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [showTags, setShowTags] = useState(true);
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
      const matchesSearch =
        !normalizedSearch ||
        [problem.title, problem.topic, problem.source, problem.statement]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesTopic && matchesSearch;
    });
  }, [problems, search, topicFilter]);

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

  return (
    <div className="space-y-4 rounded-3xl border border-ui bg-panel p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <label className="mb-2 block text-sm text-muted" htmlFor="search">
              搜索题目
            </label>
            <input
              id="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="输入题目名称、标签或来源"
              className="w-full rounded-2xl border border-ui bg-panel-strong px-4 py-3 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-muted" htmlFor="topic">
              标签筛选
            </label>
            <select
              id="topic"
              value={topicFilter}
              onChange={(event) => setTopicFilter(event.target.value)}
              className="w-full rounded-2xl border border-ui bg-panel-strong px-4 py-3 text-sm outline-none"
            >
              <option value="all">全部标签</option>
              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={showTags}
          onClick={() => setShowTags((value) => !value)}
          className="flex items-center justify-between gap-3 rounded-full border border-ui bg-panel-strong px-4 py-3 text-sm transition hover:bg-panel"
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

      <div className="overflow-hidden rounded-2xl border border-ui">
        {filteredProblems.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted">
            没有找到匹配的题目。
          </div>
        ) : (
          <div className="divide-y divide-ui">
            {filteredProblems.map((problem, index) => {
              const difficulty = difficultyLabel[problem.difficulty];
              const isFavorited = favoriteIds.includes(problem.id);

              return (
                <div
                  key={problem.id}
                  className="group flex flex-col gap-4 px-4 py-4 transition hover:bg-panel-strong/60 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    {userId ? (
                      <button
                        type="button"
                        onClick={() => toggleFavorite(problem.id)}
                        aria-pressed={isFavorited}
                        aria-label={isFavorited ? "取消收藏" : "收藏题目"}
                        className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border transition ${
                          isFavorited
                            ? "border-current bg-current text-[var(--bg)]"
                            : "border-ui bg-panel-strong text-muted"
                        }`}
                        style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
                      >
                        <Star className="absolute left-1.5 top-1.5 h-3.5 w-3.5 fill-current" />
                      </button>
                    ) : null}

                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-ui bg-panel-strong font-mono text-sm font-semibold tracking-[0.2em]">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="min-w-0">
                      <Link
                        href={`/problems/${problem.slug}`}
                        className="text-lg font-semibold transition hover:underline"
                      >
                        {problem.title}
                      </Link>
                      {showTags ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                          <span className="rounded-full border border-ui bg-panel-strong px-3 py-1">
                            {problem.topic}
                          </span>
                          <span className="rounded-full border border-ui bg-panel-strong px-3 py-1">
                            {problem.source}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-start gap-4 text-sm lg:min-w-[320px] lg:justify-end lg:text-right">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">
                        过题人数
                      </p>
                      <p className="mt-1 font-medium text-current">
                        {getSolvedCount(problem.acceptanceRate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">
                        难度
                      </p>
                      <p className="mt-1 font-medium text-current">
                        {difficulty}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">
                        通过率
                      </p>
                      <p className="mt-1 font-medium text-current">
                        {Math.round((problem.acceptanceRate ?? 0) * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
