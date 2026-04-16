import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { SectionCard } from "@/components/section-card";
import {
  difficultyLabel,
  getProblemBySlug,
  problemTypeLabel,
} from "@/lib/problems";
import { ProblemSubmitPanel } from "@/components/problem-submit-panel";

type ProblemPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProblemDetailPage({ params }: ProblemPageProps) {
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

  return (
    <SiteShell>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <SectionCard
          title="题目描述"
          subtitle="这里后续接入真实题干、样例和约束"
        >
          <div className="space-y-4 text-sm leading-7">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-ui bg-panel-strong px-3 py-1 text-xs">
                {problemTypeLabel[problem.type]}
              </span>
              <span className="rounded-full border border-ui px-3 py-1 text-xs text-muted">
                难度 {difficulty}
              </span>
              {problem.timeLimitMs ? (
                <span className="rounded-full border border-ui px-3 py-1 text-xs text-muted">
                  时限 {problem.timeLimitMs}ms
                </span>
              ) : null}
            </div>

            <p>{problem.statement}</p>

            {problem.type === "FUNCTIONAL" ? (
              <div className="rounded-2xl border border-ui bg-panel-strong p-4 font-mono text-sm">
                函数签名: {problem.functionSignature}
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl border border-ui bg-panel-strong p-4 text-sm">
                <p>输入格式: {problem.traditionalInputFormat}</p>
                <p>输出格式: {problem.traditionalOutputFormat}</p>
              </div>
            )}

            <div className="space-y-3">
              {problem.examples.map((example, index) => (
                <div
                  key={example.id}
                  className="rounded-2xl border border-ui bg-panel-strong p-4"
                >
                  <p className="text-sm font-medium">样例 {index + 1}</p>
                  <p className="mt-2 font-mono">输入: {example.input}</p>
                  <p className="mt-1 font-mono">输出: {example.output}</p>
                  {example.explanation ? (
                    <p className="mt-2 text-muted">
                      说明: {example.explanation}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <p>
              建议把代码提交后返回结果、错误定位和 AI
              分析统一展示，形成完整学习闭环。
            </p>
          </div>
        </SectionCard>
        <SectionCard
          title="代码编辑区"
          subtitle={
            problem.type === "FUNCTIONAL"
              ? "函数式题已支持提交评测（当前评测链路使用标准输入输出）"
              : "传统提交：完整程序读取标准输入并输出结果"
          }
        >
          <ProblemSubmitPanel
            problemSlug={problem.slug}
            problemType={problem.type}
            initialCode={defaultCode}
          />
        </SectionCard>
      </div>
    </SiteShell>
  );
}
