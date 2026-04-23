import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { prisma } from "@/lib/prisma";

type UserProfilePageProps = {
  params: Promise<{ id: string }>;
};

function formatDateTime(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  const ss = `${date.getSeconds()}`.padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

export default async function UserProfilePage({
  params,
}: UserProfilePageProps) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          submissions: true,
        },
      },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          score: true,
          createdAt: true,
          problem: {
            select: {
              slug: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <SiteShell requireAuth={false}>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold">{user.name}</h1>
        <p className="mt-2 text-sm text-muted">
          注册时间：{formatDateTime(user.createdAt)} · 提交总数：
          {user._count.submissions}
        </p>

        <section className="mt-6">
          <h2 className="text-base font-semibold">最近提交</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ui bg-panel-strong text-left">
                  <th className="h-10 px-3">题目</th>
                  <th className="h-10 px-3">分数</th>
                  <th className="h-10 px-3">提交时间</th>
                </tr>
              </thead>
              <tbody>
                {user.submissions.length === 0 ? (
                  <tr className="border-b border-ui">
                    <td
                      colSpan={3}
                      className="px-3 py-8 text-center text-muted"
                    >
                      暂无提交记录。
                    </td>
                  </tr>
                ) : (
                  user.submissions.map((submission) => (
                    <tr key={submission.id} className="border-b border-ui">
                      <td className="h-11 px-3">
                        <Link
                          href={`/problems/${submission.problem.slug}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {submission.problem.title}
                        </Link>
                      </td>
                      <td className="h-11 px-3">{submission.score}</td>
                      <td className="h-11 px-3 tabular-nums text-muted">
                        {formatDateTime(submission.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
