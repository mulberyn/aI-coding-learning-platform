"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TopNavBar } from "@/app/components/TopNavBar";
import { ProblemStatistics } from "@/components/problem-statistics";
import { ArrowLeft } from "lucide-react";
import { useSession } from "next-auth/react";

type StatisticsData = {
  totalSubmissions: number;
  totalAccepted: number;
  acceptanceRate: number;
  submissions: Array<{
    id: string;
    userId: string;
    userName: string;
    language: string;
    score: number;
    runtime?: number;
    memory?: number;
    codeLength?: number;
    createdAt: string;
  }>;
  submissionStats: {
    accepted: number;
    wrongAnswer: number;
    runtimeError: number;
    timeoutError: number;
    compileError: number;
  };
};

function StatisticsContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const problemId = searchParams.get("problemId");
  const problemSlug = searchParams.get("problemSlug");
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await fetch(
          `/api/statistics?problemSlug=${problemSlug}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch statistics");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [problemSlug]);

  const routes = [
    { href: "/", label: "首页" },
    { href: "/problems", label: "题库" },
    { href: "/submissions", label: "提交记录" },
    { href: "/contests", label: "比赛" },
    { href: "/forum", label: "论坛" },
  ];

  return (
    <>
      <TopNavBar
        routes={routes}
        signedIn={!!session}
        userName={session?.user?.name}
      />
      <main className="min-h-screen bg-background pt-12">
        {/* 返回按钮 */}
        <div className="border-b border-ui bg-background">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Link
              href={problemSlug ? `/problems/${problemSlug}` : "/problems"}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-panel-strong transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回题目
            </Link>
          </div>
        </div>

        {/* 标题 */}
        <div className="bg-background">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-2xl font-semibold text-foreground">统计信息</h1>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-12 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted">加载中...</div>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-200">
              <p className="font-medium">加载失败</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : data ? (
            <ProblemStatistics
              problemId={problemId || ""}
              problemSlug={problemSlug || ""}
              totalSubmissions={data.totalSubmissions}
              totalAccepted={data.totalAccepted}
              acceptanceRate={data.acceptanceRate}
              submissions={data.submissions.map((s) => ({
                ...s,
                createdAt: new Date(s.createdAt),
              }))}
              submissionStats={data.submissionStats}
            />
          ) : (
            <div className="text-center text-muted">暂无数据</div>
          )}
        </div>
      </main>
    </>
  );
}

export function StatisticsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-muted">加载中...</div>
        </div>
      }
    >
      <StatisticsContent />
    </Suspense>
  );
}
