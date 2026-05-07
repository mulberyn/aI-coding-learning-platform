import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { auth } from "@/auth";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";
import { FORUM_BOARD_LABEL_MAP, formatForumDate } from "@/lib/forum";
import { ForumComments } from "./forum-comments";

type ForumPostDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ForumPostDetailPage({
  params,
}: ForumPostDetailPageProps) {
  const session = await auth();
  const { id } = await params;

  const post = await prisma.forumPost.findUnique({
    where: { id },
    include: {
      user: {
        select: { name: true },
      },
      problem: {
        select: { problemNumber: true },
      },
      comments: {
        include: {
          user: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!post) {
    notFound();
  }

  const initialComments = post.comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    userName: comment.user.name,
  }));

  return (
    <SiteShell requireAuth={false}>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-ui pb-5">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {post.title}
            </h1>
            <p className="text-sm text-muted">
              {post.problem?.problemNumber
                ? `题号 P${String(post.problem.problemNumber).padStart(4, "0")}`
                : "无关联题号"}
              {" · "}
              {FORUM_BOARD_LABEL_MAP[post.board]}
            </p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span>作者 {post.user.name}</span>
            <span>{formatForumDate(post.createdAt)}</span>
          </div>
        </header>

        <section className="prose prose-sm mt-6 max-w-none text-foreground dark:prose-invert">
          <ReactMarkdown
            components={{
              img: ({ node, ...props }) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  {...props}
                  alt={props.alt ?? "forum image"}
                  className="my-3 max-h-[28rem] w-full rounded-md border border-ui object-contain"
                />
              ),
              code: ({ node, inline, className, children, ...props }: any) =>
                inline ? (
                  <code className="rounded bg-panel px-1.5 py-0.5" {...props}>
                    {children}
                  </code>
                ) : (
                  <pre className="overflow-x-auto rounded-md border border-ui bg-panel p-3">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ),
            }}
          >
            {post.content}
          </ReactMarkdown>
        </section>

        <ForumComments
          postId={post.id}
          initialComments={initialComments}
          canComment={Boolean(session?.user?.id)}
        />
      </div>
    </SiteShell>
  );
}
