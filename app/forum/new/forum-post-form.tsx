"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { ArrowLeft, Send } from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import { FORUM_BOARD_LABEL_MAP, FORUM_BOARD_OPTIONS } from "@/lib/forum";

type ProblemOption = {
  value: string;
  label: string;
};

type ForumPostFormProps = {
  problemOptions: ProblemOption[];
  canPost: boolean;
};

export function ForumPostForm({ problemOptions, canPost }: ForumPostFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [board, setBoard] = useState("");
  const [problemNumber, setProblemNumber] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showProblemSelect = board === "PROBLEM";

  const boardLabel = useMemo(() => {
    return FORUM_BOARD_LABEL_MAP[board as keyof typeof FORUM_BOARD_LABEL_MAP];
  }, [board]);

  async function handleSubmit() {
    if (!canPost) {
      setErrorMessage("请先登录后再发帖。");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("请填写帖子标题。");
      return;
    }

    if (!board) {
      setErrorMessage("请选择板块。");
      return;
    }

    if (board === "PROBLEM" && !problemNumber) {
      setErrorMessage("题目板块需要选择相关题号。");
      return;
    }

    if (!content.trim()) {
      setErrorMessage("请填写帖子内容。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/forum/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          board,
          problemNumber:
            board === "PROBLEM"
              ? Number.parseInt(problemNumber, 10)
              : undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "发帖失败，请稍后重试");
      }

      const payload = (await response.json()) as { postId: string };
      router.push(`/forum/${payload.postId}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "发帖失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            发帖
          </h1>
          <p className="mt-1 text-sm text-muted">
            在这里发布讨论帖，内容支持 Markdown 预览。
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/forum")}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-ui bg-panel px-3 text-sm text-foreground transition hover:bg-panel-strong"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          返回论坛
        </button>
      </div>

      {!canPost ? (
        <div className="mb-5 rounded-md border border-ui bg-panel px-4 py-3 text-sm text-muted">
          当前未登录，登录后才能发帖。
        </div>
      ) : null}

      <div className="grid gap-3 border-y border-ui py-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.55fr)_minmax(0,0.55fr)]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="输入讨论帖标题"
          className="h-10 rounded-md border border-ui bg-panel px-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary/40"
        />

        <div>
          <CustomSelect
            options={FORUM_BOARD_OPTIONS}
            value={board}
            onChange={(value) => {
              setBoard(value);
              if (value !== "PROBLEM") {
                setProblemNumber("");
              }
            }}
            placeholder="选择板块"
          />
          {boardLabel ? (
            <p className="mt-2 text-xs text-muted">当前板块：{boardLabel}</p>
          ) : null}
        </div>

        {showProblemSelect ? (
          <CustomSelect
            options={problemOptions}
            value={problemNumber}
            onChange={setProblemNumber}
            placeholder="选择题号"
          />
        ) : (
          <div className="h-10 rounded-md border border-dashed border-ui bg-panel-strong/60 px-3 text-sm leading-10 text-muted">
            题目板块时选择题号
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="flex min-h-[540px] flex-col rounded-md border border-ui bg-panel p-4">
          <div className="mb-2 text-sm font-medium text-foreground">
            内容编辑
          </div>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="输入帖子内容，支持 Markdown，例如标题、列表、引用、代码块和图片链接"
            className="min-h-[420px] flex-1 resize-none rounded-md border border-ui bg-background px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary/40"
          />
        </div>

        <div className="flex min-h-[540px] flex-col rounded-md border border-ui bg-panel p-4">
          <div className="mb-2 text-sm font-medium text-foreground">
            Markdown 预览
          </div>
          <div className="prose prose-sm min-h-[420px] flex-1 max-w-none overflow-auto rounded-md border border-ui bg-background px-3 py-3 text-foreground dark:prose-invert">
            {content.trim() ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : (
              <p className="text-muted">输入内容后，这里会实时显示渲染结果。</p>
            )}
          </div>
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-4 text-sm text-red-500">{errorMessage}</p>
      ) : null}

      <div className="mt-5 flex items-center justify-end">
        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !canPost}
          whileTap={{ scale: 0.96 }}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-sky-300 px-4 text-sm font-medium text-sky-950 shadow-sm transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="h-4 w-4" aria-hidden />
          {isSubmitting ? "发送中..." : "发送"}
        </motion.button>
      </div>
    </div>
  );
}
