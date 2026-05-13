import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TopNavBar } from "@/app/components/TopNavBar";
import { LearningSubmissionsList } from "./submissions-list";

type LearnPageProps = {
  searchParams: Promise<{ problemId?: string; problemSlug?: string }>;
};

export default async function LearnPage({ searchParams }: LearnPageProps) {
  const { problemId, problemSlug } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="min-h-screen bg-background pt-16">
        <TopNavBar />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-foreground">学习</h1>
          <p className="mt-3 text-muted">请先登录后查看学习内容</p>
          <div className="mt-6">
            <Link
              href="/login"
              className="rounded-lg border border-ui px-3 py-2 text-sm text-foreground hover:bg-panel-strong"
            >
              前往登录
            </Link>
          </div>
        </div>
      </main>
    );
  }

  let problem = null;

  if (problemId) {
    problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true, title: true, slug: true },
    });
  } else if (problemSlug) {
    problem = await prisma.problem.findUnique({
      where: { slug: problemSlug },
      select: { id: true, title: true, slug: true },
    });
  }

  if (!problem) {
    return (
      <main className="min-h-screen bg-background pt-16">
        <TopNavBar />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-foreground">学习</h1>
          <p className="mt-3 text-muted">题目未找到</p>
          <div className="mt-6">
            <Link
              href="/problems"
              className="rounded-lg border border-ui px-3 py-2 text-sm text-foreground hover:bg-panel-strong"
            >
              返回题库
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-16">
      <TopNavBar
        signedIn={!!session}
        userId={session?.user?.id}
        userName={session?.user?.name}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={`/problems/${problem.slug}`}
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <span>←</span>
            返回题目详情
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            {problem.title} - 学习
          </h1>
          <p className="mt-2 text-sm text-muted">
            查看你在该题目的所有提交记录，并获取 AI 辅导
          </p>
        </div>

        <LearningSubmissionsList
          problemId={problem.id}
          problemSlug={problem.slug}
          userId={session.user.id}
        />
      </div>
    </main>
  );
}
