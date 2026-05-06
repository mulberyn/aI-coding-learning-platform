import { Suspense } from "react";
import { TopNavBar } from "@/app/components/TopNavBar";
import { ContestsFilter } from "@/components/contests-filter";
import { OngoingContests } from "@/components/ongoing-contests";
import { CustomSelect } from "@/components/custom-select";
import { prisma } from "@/lib/prisma";
import ContestsPageClient from "./contests-client";

const navigationRoutes = [
  { href: "/", label: "首页" },
  { href: "/problems", label: "题库" },
  { href: "/submissions", label: "提交记录" },
  { href: "/contests", label: "比赛" },
  { href: "/forum", label: "论坛" },
];

async function loadContests() {
  const contests = await prisma.contest.findMany({
    orderBy: { startTime: "desc" },
  });
  return contests;
}

export default async function ContestsPage() {
  const contests = await loadContests();

  // 转换为客户端可序列化的格式
  const serializedContests = contests.map((c) => ({
    ...c,
    startTime: c.startTime.toISOString(),
    endTime: c.endTime.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-background">
      <TopNavBar routes={navigationRoutes} signedIn={false} />

      <div className="pt-12">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              比赛中心
            </h1>
            <p className="mt-2 text-sm text-muted">
              参加各类编程竞赛，与全球编程爱好者同场竞技
            </p>
          </div>

          <div className="space-y-6">
            {/* 进行中的比赛 */}
            <OngoingContests contests={serializedContests} />

            {/* 使用客户端组件处理筛选和排序 */}
            <Suspense
              fallback={<div className="text-center text-muted">加载中...</div>}
            >
              <ContestsPageClient contests={serializedContests} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
