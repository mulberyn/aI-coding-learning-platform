import Link from "next/link";
import { auth } from "@/auth";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";
import { ForumPostForm } from "./forum-post-form";

export default async function NewForumPostPage() {
  const session = await auth();
  const problems = await prisma.problem.findMany({
    select: {
      id: true,
      title: true,
      problemNumber: true,
    },
    orderBy: { problemNumber: "asc" },
  });

  return (
    <SiteShell requireAuth={false}>
      <div className="border-b border-ui bg-background">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/forum"
            className="text-sm text-muted hover:text-foreground"
          >
            返回论坛列表
          </Link>
        </div>
      </div>

      <ForumPostForm
        problemOptions={problems.map((problem) => ({
          value: String(problem.problemNumber),
          label: `P${String(problem.problemNumber).padStart(4, "0")} · ${problem.title}`,
        }))}
        canPost={Boolean(session?.user?.id)}
      />
    </SiteShell>
  );
}
