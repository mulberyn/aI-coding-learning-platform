"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareMore, Send, X } from "lucide-react";
import { formatForumDate } from "@/lib/forum";

type ForumComment = {
  id: string;
  content: string;
  createdAt: string;
  userName: string;
};

type ForumCommentsProps = {
  postId: string;
  initialComments: ForumComment[];
  canComment: boolean;
};

export function ForumComments({
  postId,
  initialComments,
  canComment,
}: ForumCommentsProps) {
  const [comments, setComments] = useState(initialComments);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const commentCount = comments.length;

  const preview = useMemo(() => draft.trim(), [draft]);

  async function handleSubmit() {
    if (!draft.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/forum/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: draft }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "发送失败，请稍后重试");
      }

      const payload = (await response.json()) as {
        comment: ForumComment;
      };

      setComments((current) => [payload.comment, ...current]);
      setDraft("");
      setSendSuccess(true);
      window.setTimeout(() => setSendSuccess(false), 1200);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "发送失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between border-b border-ui pb-2">
        <h2 className="text-base font-semibold text-foreground">评论区</h2>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="flex items-center gap-1">
            <MessageSquareMore className="h-3.5 w-3.5" aria-hidden />
            {commentCount} 条评论
          </span>
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-ui bg-panel px-3 text-sm text-foreground transition hover:bg-panel-strong"
          >
            <MessageSquareMore className="h-4 w-4 text-primary" aria-hidden />
            发送评论
          </button>
        </div>
      </div>

      <AnimatePresence>
        {composerOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-5 rounded-md border border-ui bg-panel p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-foreground">写评论</div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ui bg-panel-strong text-muted transition hover:text-foreground"
                aria-label="关闭评论输入框"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {!canComment ? (
              <p className="mb-3 rounded-md border border-ui bg-panel-strong px-3 py-2 text-sm text-muted">
                请先登录后再发表评论。
              </p>
            ) : null}

            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="支持 Markdown，例如 **加粗**、`代码`、列表等"
              className="min-h-32 w-full rounded-md border border-ui bg-panel px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary/40"
            />

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-md border border-ui bg-panel-strong p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  预览
                </div>
                <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                  {preview ? (
                    <ReactMarkdown>{preview}</ReactMarkdown>
                  ) : (
                    <p className="m-0 text-sm text-muted">
                      输入内容后会显示 Markdown 预览。
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-md border border-ui bg-panel-strong p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  提示
                </div>
                <ul className="space-y-1 text-sm text-muted">
                  <li>- 支持标题、列表、引用和代码块。</li>
                  <li>- 发送后评论会立即出现在评论区顶部。</li>
                </ul>
              </div>
            </div>

            {errorMessage ? (
              <p className="mt-3 text-sm text-red-500">{errorMessage}</p>
            ) : null}

            {sendSuccess ? (
              <p className="mt-3 text-sm text-emerald-600">评论已发送。</p>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-md border border-ui bg-panel px-4 text-sm text-foreground transition hover:bg-panel-strong"
              >
                取消
              </button>
              <motion.button
                type="button"
                onClick={handleSubmit}
                disabled={!canComment || !draft.trim() || isSubmitting}
                whileTap={{ scale: 0.96 }}
                animate={sendSuccess ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 0.28 }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-sky-300 text-sky-950 shadow-sm transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="发送评论"
                title="发送评论"
              >
                <Send className="h-4 w-4" aria-hidden />
              </motion.button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!canComment ? (
        <p className="mb-4 text-sm text-muted">登录后可以发送评论。</p>
      ) : null}

      {comments.length === 0 ? (
        <p className="py-6 text-sm text-muted">
          还没有评论，来发布第一条评论吧。
        </p>
      ) : (
        <div className="divide-y divide-ui border-t border-ui">
          {comments.map((comment) => (
            <article key={comment.id} className="py-4">
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span>{comment.userName}</span>
                <span>{formatForumDate(new Date(comment.createdAt))}</span>
              </div>
              <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                <ReactMarkdown>{comment.content}</ReactMarkdown>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
