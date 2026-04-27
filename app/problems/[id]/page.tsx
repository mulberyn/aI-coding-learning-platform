import { notFound } from "next/navigation";
import { difficultyLabel, getProblemBySlug } from "@/lib/problems";
import { auth } from "@/auth";
import { CopyButton } from "../../../components/copy-button";
import { ProblemSidebar } from "@/components/problem-sidebar";
import { ProblemHeader } from "@/components/problem-header";
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

type StatementSections = {
  description: string;
  inputFormat: string | null;
  outputFormat: string | null;
  dataRange: string | null;
};

function parseStatementSections(statement: string): StatementSections {
  const cleaned = statement.replace(/\r\n?/g, "\n").trim();
  const getSection = (name: string) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?:^|\\n)##\\s*${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
      "m",
    );
    const matched = cleaned.match(regex);
    return matched?.[1]?.trim() || null;
  };

  const description =
    getSection("题目描述") ||
    cleaned
      .replace(/^#.*$/gm, "")
      .replace(/^##.*$/gm, "")
      .trim();

  return {
    description,
    inputFormat: getSection("输入格式"),
    outputFormat: getSection("输出格式"),
    dataRange: getSection("数据范围"),
  };
}

export default async function ProblemDetailPage({ params }: ProblemPageProps) {
  const session = await auth();
  const { id } = await params;
  const problem = await getProblemBySlug(id);

  if (!problem) {
    notFound();
  }

  const difficulty = difficultyLabel[problem.difficulty];
  const statementSections = parseStatementSections(problem.statement);
  const displayInputFormat =
    statementSections.inputFormat || problem.traditionalInputFormat;
  const displayOutputFormat =
    statementSections.outputFormat || problem.traditionalOutputFormat;
  const displayDataRange =
    statementSections.dataRange ||
    `时间限制: ${problem.timeLimitMs ? `${problem.timeLimitMs} ms` : "1s"}\n空间限制: ${problem.memoryLimitMb ? `${problem.memoryLimitMb} MB` : "256MB"}`;
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
      <main className="min-h-screen bg-background pt-12">
        {/* 顶部 */}
        <div className="border-b border-ui bg-background">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-6">
              <ProblemHeader
                problemId={problem.id}
                problemNumber={problem.problemNumber}
                title={problem.title}
                topic={problem.topic}
                source={problem.source}
                userId={session?.user?.id}
              />
              <div className="mt-2 flex shrink-0 items-stretch self-end text-center text-sm text-muted">
                <div className="flex min-w-[50px] flex-col items-center justify-center px-3 pt-1">
                  <span className="text-xs font-medium tracking-wide text-muted text-center">
                    提交
                  </span>
                  <span className="mt-1 text-sm font-medium leading-none text-foreground text-center">
                    {problem._count?.submissions ?? 0}
                  </span>
                </div>
                <div className="w-[2px] self-stretch bg-zinc-400/80 dark:bg-zinc-500/90" />
                <div className="flex min-w-[50px] flex-col items-center justify-center px-3 pt-1">
                  <span className="text-xs font-medium tracking-wide text-muted text-center">
                    通过
                  </span>
                  <span className="mt-1 text-sm font-medium leading-none text-foreground text-center">
                    {problem.acceptanceRate || 0}%
                  </span>
                </div>
                <div className="w-[2px] self-stretch bg-zinc-400/80 dark:bg-zinc-500/90" />
                <div className="flex min-w-[50px] flex-col items-center justify-center px-3 pt-1">
                  <span className="text-xs font-medium tracking-wide text-muted text-center">
                    时间限制
                  </span>
                  <span className="mt-1 text-sm font-medium leading-none text-foreground text-center">
                    1s
                  </span>
                </div>
                <div className="w-[2px] self-stretch bg-zinc-400/80 dark:bg-zinc-500/90" />
                <div className="flex min-w-[50px] flex-col items-center justify-center pl-3 pt-1">
                  <span className="text-xs font-medium tracking-wide text-muted text-center">
                    空间限制
                  </span>
                  <span className="mt-1 text-sm font-medium leading-none text-foreground text-center">
                    256MB
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 主体内容 */}
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_250px] lg:px-8">
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
                {statementSections.description}
              </p>
            </section>

            {/* 输入格式 */}
            {problem.type === "TRADITIONAL" && displayInputFormat && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <ArrowLeft className="h-5 w-5 text-foreground" />
                  <h2 className="text-xl font-semibold text-foreground">
                    输入格式
                  </h2>
                </div>
                <p className="text-muted leading-7 whitespace-pre-wrap">
                  {displayInputFormat}
                </p>
              </section>
            )}

            {/* 输出格式 */}
            {problem.type === "TRADITIONAL" && displayOutputFormat && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <ArrowRight className="h-5 w-5 text-foreground" />
                  <h2 className="text-xl font-semibold text-foreground">
                    输出格式
                  </h2>
                </div>
                <p className="text-muted leading-7 whitespace-pre-wrap">
                  {displayOutputFormat}
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
              <p className="text-muted leading-7 whitespace-pre-wrap">
                {displayDataRange}
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
