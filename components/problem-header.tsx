"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

type ProblemHeaderProps = {
  problemId: string;
  problemNumber: number | null;
  title: string;
  topic: string;
  source: string;
  userId?: string | null;
};

export function ProblemHeader({
  problemId,
  problemNumber,
  title,
  topic,
  source,
  userId,
}: ProblemHeaderProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);

  const storageKey = userId ? `problem-favorites:${userId}` : null;

  useEffect(() => {
    if (!storageKey) {
      setIsFavorited(false);
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      const favoriteIds = raw ? (JSON.parse(raw) as string[]) : [];
      setIsFavorited(favoriteIds.includes(problemId));
    } catch {
      setIsFavorited(false);
    }
  }, [problemId, storageKey]);

  function toggleFavorite() {
    if (!storageKey) return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      const favoriteIds = raw ? (JSON.parse(raw) as string[]) : [];

      let nextFavorites: string[];
      if (favoriteIds.includes(problemId)) {
        nextFavorites = favoriteIds.filter((id) => id !== problemId);
        setIsFavorited(false);
      } else {
        nextFavorites = [...favoriteIds, problemId];
        setIsFavorited(true);
      }

      window.localStorage.setItem(storageKey, JSON.stringify(nextFavorites));
    } catch {
      // Handle storage error
    }
  }

  // 使用 topic 和 source 作为标签
  const tags = [topic, source].filter(Boolean);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">
              {problemNumber}. {title}
            </h1>
            {userId && (
              <button
                type="button"
                onClick={toggleFavorite}
                aria-pressed={isFavorited}
                aria-label={isFavorited ? "取消收藏" : "收藏题目"}
                className={`mt-1 h-6 w-6 transition ${
                  isFavorited
                    ? "text-rose-500"
                    : "text-muted hover:text-rose-400"
                }`}
              >
                <Star className="h-6 w-6 fill-current" />
              </button>
            )}
          </div>
          {tags.length > 0 && (
            <div className="mt-4 flex min-h-8 items-center gap-3">
              <button
                type="button"
                onClick={() => setTagsExpanded((value) => !value)}
                aria-expanded={tagsExpanded}
                aria-label={tagsExpanded ? "收起标签" : "展开标签"}
                className="inline-flex h-6 items-center gap-1 rounded-sm text-sm font-medium text-muted transition hover:text-foreground"
              >
                <span>{tagsExpanded ? "隐藏标签" : "显示标签"}</span>
                <span aria-hidden className="text-sm leading-none">
                  {tagsExpanded ? "<" : ">"}
                </span>
              </button>
              <div
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 transition-all duration-200 ease-in-out ${
                  tagsExpanded
                    ? "max-h-20 opacity-100"
                    : "max-h-0 overflow-hidden opacity-0"
                }`}
              >
                {tags.map((tag) => (
                  <div key={tag} className="text-sm text-foreground">
                    <span className="font-medium">#</span>
                    <span>{tag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
