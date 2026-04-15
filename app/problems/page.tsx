import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { SectionCard } from "@/components/section-card";
import {
  difficultyLabel,
  getPartitionedProblems,
  problemTypeLabel,
} from "@/lib/problems";

const badgeStyles: Record<string, string> = {
  Easy: "bg-panel-strong text-muted border-ui",
  Medium: "bg-panel-strong text-muted border-ui",
  Hard: "bg-panel-strong text-muted border-ui",
};

type SectionProps = {
  heading: string;
  subtitle: string;
  rows: Awaited<ReturnType<typeof getPartitionedProblems>>["functional"];
};

function ProblemSection({ heading, subtitle, rows }: SectionProps) {
  return (
    <SectionCard title={heading} subtitle={subtitle}>
      <div className="grid gap-4">
        {rows.map((problem) => {
          const label = difficultyLabel[problem.difficulty];
          return (
            <Link
              key={problem.id}
              href={`/problems/${problem.slug}`}
              className="rounded-2xl border border-ui bg-panel p-4 transition hover:bg-panel-strong"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{problem.title}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {problem.topic} · 来源 {problem.source}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className={`rounded-full border px-3 py-1 ${badgeStyles[label]}`}
                  >
                    {label}
                  </span>
                  <span className="text-muted">
                    通过率 {((problem.acceptanceRate ?? 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}

export default async function ProblemsPage() {
  const partitioned = await getPartitionedProblems();

  return (
    <SiteShell title="Problems" eyebrow="题库、练习和提交评测入口">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <SectionCard
          title="题型分区"
          subtitle="根据题目类型区分函数式题与传统输入输出题"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-ui bg-panel-strong p-4">
              <h3>{problemTypeLabel.FUNCTIONAL}</h3>
              <p className="mt-2 text-sm text-muted">
                适合练习函数签名、返回值验证与单例用例。
              </p>
            </div>
            <div className="rounded-2xl border border-ui bg-panel-strong p-4">
              <h3>{problemTypeLabel.TRADITIONAL}</h3>
              <p className="mt-2 text-sm text-muted">
                适合练习标准输入输出、时空限制和批量评测。
              </p>
            </div>
          </div>
        </SectionCard>

        <ProblemSection
          heading="函数式题目分区"
          subtitle="LeetCode 风格，提交函数并返回结果"
          rows={partitioned.functional}
        />
        <ProblemSection
          heading="传统提交分区"
          subtitle="Codeforces 风格，读取标准输入并输出结果"
          rows={partitioned.traditional}
        />
      </div>
    </SiteShell>
  );
}
