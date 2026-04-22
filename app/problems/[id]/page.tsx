import { notFound } from "next/navigation";
import { difficultyLabel, getProblemBySlug } from "@/lib/problems";
import { auth } from "@/auth";
import { CopyButton } from "@/components/copy-button";
import { ProblemSidebar } from "@/components/problem-sidebar";
import { TopNavBar } from "@/app/components/TopNavBar";
import {
  BookOpen,
  FileText,
  ArrowLeft,
  ArrowRight,
  Database,
} from "lucide-react";

type ProblemPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProblemDetailPage({ params }: ProblemPageProps) {
  const session = await auth();
  const { id } = await params;
  const problem = await getProblemBySlug(id);

  if (!problem) {
    notFound();
  }

  const difficulty = difficultyLabel[problem.difficulty];
  const defaultCode =
    problem.type === "FUNCTIONAL"
      ? `#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  // TODO: 根据题意读取输入并输出
  return 0;
}`
      : `#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  // TODO: 根据题意读取输入并输出
  return 0;
}`;

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
      <main className="min-h-screen bg-background pt-14">
        {/* 顶部 */}
        <div className="border-b border-ui bg-background">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-foreground">
                    {problem.problemNumber}. {problem.title}
                  </h1>
                  <button
                    className="mt-1 rounded-lg border border-ui bg-background p-2 text-muted hover:bg-panel-strong transition-colors"
                    title="收藏题目"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h6a2 2 0 012 2v12a1 1 0 01-1 1H6a1 1 0 01-1-1V5z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="text-right text-sm text-muted space-y-1">
                <div>
                  提交人数:{" "}
                  <span className="text-foreground font-medium">-</span>
                </div>
                <div>
                  通过率:{" "}
                  <span className="text-foreground font-medium">
                    {problem.acceptanceRate || 0}%
                  </span>
                </div>
                <div>
                  时间限制:{" "}
                  <span className="text-foreground font-medium">1s</span>
                </div>
                <div>
                  空间限制:{" "}
                  <span className="text-foreground font-medium">256MB</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 主体内容 */}
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
          {/* 左侧：题目描述 */}
          <div className="space-y-8">
            {/* 题目描述 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-foreground" />
                <h2 className="text-xl font-semibold text-foreground">
                  题目描述
                </h2>
              </div>
              <p className="text-muted leading-7 whitespace-pre-wrap">
                {problem.statement}
              </p>
            </section>

            {/* 输入格式 */}
            {problem.type === "TRADITIONAL" && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <ArrowLeft className="h-5 w-5 text-foreground" />
                  <h2 className="text-xl font-semibold text-foreground">
                    输入格式
                  </h2>
                </div>
                <p className="text-muted leading-7 whitespace-pre-wrap">
                  {problem.traditionalInputFormat}
                </p>
              </section>
            )}

            {/* 输出格式 */}
            {problem.type === "TRADITIONAL" && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <ArrowRight className="h-5 w-5 text-foreground" />
                  <h2 className="text-xl font-semibold text-foreground">
                    输出格式
                  </h2>
                </div>
                <p className="text-muted leading-7 whitespace-pre-wrap">
                  {problem.traditionalOutputFormat}
                </p>
              </section>
            )}

            {/* 函数签名（函数式题目） */}
            {problem.type === "FUNCTIONAL" && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-foreground" />
                  <h2 className="text-xl font-semibold text-foreground">
                    函数签名
                  </h2>
                </div>
                <div className="relative bg-panel-strong border border-ui rounded-lg p-4 overflow-x-auto">
                  <pre className="font-mono text-sm text-foreground whitespace-pre-wrap break-words">
                    {problem.functionSignature}
                  </pre>
                  <CopyButton
                    text={problem.functionSignature || ""}
                    className="absolute top-2 right-2"
                  />
                </div>
              </section>
            )}

            {/* 样例 */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Database className="h-5 w-5" />
                样例
              </h2>
              <div className="space-y-4">
                {problem.examples.map((example, index) => (
                  <div key={example.id} className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      样例 {index + 1}
                    </p>

                    {/* 样例输入 */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted font-medium">输入</p>
                      <div className="relative bg-panel-strong border border-ui rounded-lg p-4 overflow-x-auto">
                        <pre className="font-mono text-sm text-foreground whitespace-pre-wrap break-words">
                          {example.input}
                        </pre>
                        <CopyButton
                          text={example.input}
                          className="absolute top-2 right-2"
                        />
                      </div>
                    </div>

                    {/* 样例输出 */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted font-medium">输出</p>
                      <div className="relative bg-panel-strong border border-ui rounded-lg p-4 overflow-x-auto">
                        <pre className="font-mono text-sm text-foreground whitespace-pre-wrap break-words">
                          {example.output}
                        </pre>
                        <CopyButton
                          text={example.output}
                          className="absolute top-2 right-2"
                        />
                      </div>
                    </div>

                    {/* 样例说明 */}
                    {example.explanation && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted font-medium">说明</p>
                        <p className="text-muted leading-6 whitespace-pre-wrap">
                          {example.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 数据范围 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-5 w-5 text-foreground" />
                <h2 className="text-xl font-semibold text-foreground">
                  数据范围
                </h2>
              </div>
              <p className="text-muted leading-7">
                相关的数据范围信息将在此显示
              </p>
            </section>
          </div>

          {/* 右侧：问题侧栏 */}
          <ProblemSidebar
            problemId={problem.id}
            problemSlug={problem.slug}
            problemType={problem.type}
          />
        </div>
      </main>
    </>
  );
}
