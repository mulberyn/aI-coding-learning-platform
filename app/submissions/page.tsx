import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { SectionCard } from "@/components/section-card";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function SubmissionsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const submissions = await prisma.submission.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      problem: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionCard
          title="最近提交"
          subtitle="按时间倒序展示当前账号的提交历史"
        >
          {submissions.length === 0 ? (
            <div className="rounded-2xl border border-ui bg-panel-strong p-6 text-sm text-muted">
              还没有提交记录，先去 <Link href="/problems">题库</Link> 试一题。
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex flex-col gap-3 rounded-2xl border border-ui bg-panel-strong p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Link
                      href={`/problems/${submission.problem.slug}`}
                      className="text-base font-medium hover:underline"
                    >
                      {submission.problem.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted">
                      {submission.language} ·{" "}
                      {submission.createdAt.toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full border border-ui px-3 py-1">
                      {submission.status}
                    </span>
                    <span className="rounded-full border border-ui px-3 py-1">
                      得分 {submission.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </SiteShell>
  );
}
