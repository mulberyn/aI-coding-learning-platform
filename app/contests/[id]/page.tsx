import { notFound } from "next/navigation";
import { auth, signOut } from "@/auth";
import { TopNavBar } from "@/app/components/TopNavBar";
import { appRoutes } from "@/lib/route";
import { getContestDetailFromDb } from "@/lib/contest-db";
import { prisma } from "@/lib/prisma";
import ContestDetailContent from "./contest-detail-content";

type ContestDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContestDetailPage({
  params,
}: ContestDetailPageProps) {
  const session = await auth();
  const { id } = await params;
  const contest = await getContestDetailFromDb(id);

  async function handleSignOut(_formData: FormData) {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  if (!contest) {
    notFound();
  }

  const registration = session?.user?.id
    ? await prisma.contestRegistration.findUnique({
        where: {
          contestId_userId: {
            contestId: contest.id,
            userId: session.user.id,
          },
        },
        select: { id: true },
      })
    : null;

  // 获取题目信息以显示题目名称
  const problemMap: Record<string, any> = {};
  for (const problem of contest.problems) {
    const problemInfo = await prisma.problem.findUnique({
      where: { id: problem.problemId },
      select: { slug: true, title: true },
    });
    if (problemInfo) {
      problemMap[problem.problemId] = problemInfo;
    }
  }

  // 将数据转换为可序列化格式（Client Component 需要）
  const serializedContest = {
    ...contest,
    startTime: contest.startTime.toISOString(),
    endTime: contest.endTime.toISOString(),
    isRegistered: Boolean(registration),
  };

  return (
    <>
      <TopNavBar
        routes={appRoutes}
        signedIn={Boolean(session?.user)}
        userId={session?.user?.id}
        userName={session?.user?.name}
        onSignOut={session?.user ? handleSignOut : undefined}
      />
      <ContestDetailContent
        contest={serializedContest}
        problemMap={problemMap}
      />
    </>
  );
}
