import Link from "next/link";
import { ForumBoard } from "@prisma/client";
import { Flag, MessageSquareMore, Search } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";
import {
  FORUM_BOARD_LABEL_MAP,
  FORUM_BOARD_OPTIONS,
  formatForumDate,
} from "@/lib/forum";

type ForumPageProps = {
  searchParams: Promise<{
    q?: string;
    problem?: string;
    board?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 10;

function parsePositiveInteger(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function normalizeProblemNumber(problemKeyword: string) {
  const trimmed = problemKeyword.trim();
  if (!trimmed) {
    return undefined;
  }

  const fromSlug = trimmed.match(/^P?(\d{1,4})$/i);
  if (fromSlug) {
    return Number.parseInt(fromSlug[1], 10);
  }

  return undefined;
}

function buildPageHref(
  page: number,
  query: string,
  problem: string,
  board: string,
) {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (problem) {
    params.set("problem", problem);
  }
  if (board) {
    params.set("board", board);
  }
  params.set("page", String(page));

  return `/forum?${params.toString()}`;
}

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const problem = params.problem?.trim() ?? "";
  const board = params.board?.trim() ?? "";
  const currentPage = parsePositiveInteger(params.page) ?? 1;

  const boardFilter = FORUM_BOARD_OPTIONS.some((item) => item.value === board)
    ? (board as ForumBoard)
    : undefined;
  const problemNumberFilter = normalizeProblemNumber(problem);

  const where = {
    ...(boardFilter ? { board: boardFilter } : {}),
    ...(problemNumberFilter
      ? {
          problem: {
            problemNumber: problemNumberFilter,
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { content: { contains: q } },
            { user: { name: { contains: q } } },
          ],
        }
      : {}),
  };

  const totalCount = await prisma.forumPost.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const skip = (safeCurrentPage - 1) * PAGE_SIZE;

  const posts = await prisma.forumPost.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: {
      user: {
        select: { name: true },
      },
      problem: {
        select: { slug: true, problemNumber: true },
      },
      _count: {
        select: { comments: true },
      },
    },
    skip,
    take: PAGE_SIZE,
  });

  return (
    <SiteShell requireAuth={false}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          讨论论坛
        </h1>

        <form
          action="/forum"
          method="get"
          className="mt-5 grid gap-3 border-y border-ui py-4 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <label className="flex h-10 items-center gap-2 rounded-md border border-ui bg-panel px-3 text-sm">
            <Search className="h-4 w-4 text-muted" aria-hidden />
            <input
              name="q"
              defaultValue={q}
              placeholder="搜索讨论帖标题、内容或作者"
              className="w-full bg-transparent text-foreground outline-none placeholder:text-muted"
            />
          </label>

          <input
            name="problem"
            defaultValue={problem}
            placeholder="题号（如 1 / P0001）"
            className="h-10 rounded-md border border-ui bg-panel px-3 text-sm text-foreground outline-none placeholder:text-muted"
          />

          <select
            name="board"
            defaultValue={board}
            className="h-10 rounded-md border border-ui bg-panel px-3 text-sm text-foreground outline-none"
          >
            <option value="">全部板块</option>
            {FORUM_BOARD_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md border border-ui bg-panel-strong px-4 text-sm font-medium text-foreground transition hover:bg-panel"
          >
            筛选
          </button>
        </form>

        <div className="mt-4 border-t border-ui">
          {posts.length === 0 ? (
            <div className="flex h-36 items-center justify-center border-b border-ui text-sm text-muted">
              暂无符合条件的讨论帖
            </div>
          ) : (
            posts.map((post) => (
              <article
                key={post.id}
                className="border-b border-ui px-2 py-3 transition-colors hover:bg-panel"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {post.isPinned ? (
                        <Flag
                          className="h-4 w-4 shrink-0 text-red-500"
                          aria-label="置顶帖"
                        />
                      ) : null}
                      <Link
                        href={`/forum/${post.id}`}
                        className="truncate text-sm font-medium text-foreground transition hover:text-primary"
                      >
                        {post.title}
                      </Link>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span>{FORUM_BOARD_LABEL_MAP[post.board]}</span>
                      {post.problem?.problemNumber ? (
                        <span>
                          题号 P
                          {String(post.problem.problemNumber).padStart(4, "0")}
                        </span>
                      ) : (
                        <span>无关联题号</span>
                      )}
                      <span>作者 {post.user.name}</span>
                      <span>{formatForumDate(post.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted">
                    <MessageSquareMore className="h-3.5 w-3.5" aria-hidden />
                    <span>{post._count.comments} 回复</span>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-ui pt-4 text-sm">
          <p className="text-muted">
            共 {totalCount} 条讨论帖，第 {safeCurrentPage} / {totalPages} 页
          </p>

          <div className="flex items-center gap-2">
            {safeCurrentPage > 1 ? (
              <a
                href={buildPageHref(safeCurrentPage - 1, q, problem, board)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-ui bg-panel px-3 text-sm text-foreground hover:bg-panel-strong"
              >
                上一页
              </a>
            ) : (
              <span className="inline-flex h-9 items-center justify-center rounded-md border border-ui bg-panel-strong px-3 text-sm text-muted">
                上一页
              </span>
            )}

            {safeCurrentPage < totalPages ? (
              <a
                href={buildPageHref(safeCurrentPage + 1, q, problem, board)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-ui bg-panel px-3 text-sm text-foreground hover:bg-panel-strong"
              >
                下一页
              </a>
            ) : (
              <span className="inline-flex h-9 items-center justify-center rounded-md border border-ui bg-panel-strong px-3 text-sm text-muted">
                下一页
              </span>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
