import { notFound } from "next/navigation";
import { TopNavBar } from "@/app/components/TopNavBar";
import { getContestDetailFromDb } from "@/lib/contest-db";
import { prisma } from "@/lib/prisma";
import ContestDetailContent from "./contest-detail-content";

const navigationRoutes = [
  { href: "/", label: "首页" },
  { href: "/problems", label: "题库" },
  { href: "/submissions", label: "提交记录" },
  { href: "/contests", label: "比赛" },
  { href: "/forum", label: "论坛" },
];

type ContestDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContestDetailPage({
  params,
}: ContestDetailPageProps) {
  const { id } = await params;
  const contest = await getContestDetailFromDb(id);

  if (!contest) {
    notFound();
  }

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
  };

  return (
    <>
      <TopNavBar routes={navigationRoutes} signedIn={false} />
      <ContestDetailContent
        contest={serializedContest}
        problemMap={problemMap}
      />
    </>
  );
}
