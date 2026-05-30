"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ExternalLink, Loader2, Search, Sparkles, Video } from "lucide-react";

type VideoItem = {
  id: string;
  title: string;
  url: string;
  author: string;
  duration: string;
  playCount: string;
  danmakuCount: string;
  thumbnail: string;
  reason: string;
  rank: number;
};

type VideoSearchResponse = {
  query: string;
  provider: string;
  model: string;
  configName: string | null;
  totalCandidates: number;
  items: VideoItem[];
};

function getVideoSubtitle(item: VideoItem) {
  return [item.author, item.duration].filter(Boolean).join(" · ");
}

export function VideoSearchPanel() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VideoSearchResponse | null>(null);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = keyword.trim();
    if (!trimmed) {
      setError("请输入薄弱点关键词后再搜索。");
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/videos/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: trimmed }),
      });

      const payload = (await response.json()) as
        | VideoSearchResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          payload && "error" in payload
            ? (payload.error ?? "视频搜索失败")
            : "视频搜索失败",
        );
      }

      setData(payload as VideoSearchResponse);
    } catch (searchError) {
      setData(null);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "视频搜索失败，请稍后重试。",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <section className="overflow-hidden rounded-[26px] border border-ui bg-panel/95 shadow-[0_18px_50px_rgba(0,0,0,0.06)]">
        <div className="border-b border-ui bg-gradient-to-r from-sky-500/10 via-cyan-500/8 to-transparent px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-sky-500/15 text-sky-600 dark:text-sky-300">
              <Video className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-muted">
                学习视频推荐
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                根据薄弱点搜索视频
              </h1>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted sm:text-[0.98rem]">
            输入你的薄弱点关键词，系统会先抓取 B
            站和必应视频搜索结果，再使用你在设置中配置的大模型对候选视频做二次筛选，最终展示
            3 个最适合补弱的视频。
          </p>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="例如：动态规划、二分查找、并查集、前端闭包"
                className="h-12 w-full rounded-[14px] border border-ui bg-background px-11 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-sky-600 px-5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              根据薄弱点搜索
            </button>
          </form>

          {error ? (
            <div className="mt-4 rounded-[14px] border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {data ? (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-ui bg-panel-strong px-4 py-3 text-sm text-muted">
                <span>
                  关键词：
                  <strong className="text-foreground">{data.query}</strong>
                </span>
                <span>
                  筛选模型：
                  <strong className="text-foreground">
                    {data.provider} / {data.model}
                  </strong>
                  {data.configName ? (
                    <span className="ml-2">· {data.configName}</span>
                  ) : null}
                </span>
              </div>

              {data.items.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-ui bg-panel-strong px-6 py-10 text-center text-sm text-muted">
                  没有找到适合当前薄弱点的视频。可以换一个更具体的关键词再试一次。
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {data.items.map((item) => (
                    <article
                      key={item.id}
                      className="group overflow-hidden rounded-[20px] border border-ui bg-panel transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(0,0,0,0.08)]"
                    >
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                      >
                        <div className="relative flex aspect-video flex-col justify-between overflow-hidden bg-gradient-to-br from-sky-950 via-slate-900 to-cyan-900 px-4 py-4 text-white">
                          <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.28em] text-white/65">
                            <span>编程算法推荐</span>
                            <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] tracking-normal text-white/80">
                              #{item.rank}
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div className="line-clamp-3 text-[17px] font-semibold leading-7 tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                              {item.title}
                            </div>
                            <div className="max-w-[18rem] text-sm leading-6 text-white/78">
                              {getVideoSubtitle(item)}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-xs text-white/70">
                            <span>纯文字封面，避免图片加载失败</span>
                            <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] text-white/80">
                              点击打开
                            </span>
                          </div>
                        </div>
                      </a>

                      <div className="flex items-center justify-between gap-2 px-4 py-3 text-xs text-muted">
                        <span className="truncate">{item.reason}</span>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sky-600 transition hover:text-sky-700"
                        >
                          打开
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-[18px] border border-dashed border-ui bg-panel-strong px-6 py-10 text-center text-sm text-muted">
              输入关键词后开始搜索，结果区会一次性展示 3 个视频，按 3 列排布。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
