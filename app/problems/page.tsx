import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { SectionCard } from "@/components/section-card";
import { ProblemBrowser } from "@/components/problem-browser";
import { auth } from "@/auth";
import {
  getPartitionedProblems,
  getProblemCatalog,
  problemTypeLabel,
} from "@/lib/problems";

export default async function ProblemsPage() {
  const partitioned = await getPartitionedProblems();
  const catalog = await getProblemCatalog();
  const session = await auth();

  return (
    <SiteShell>
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

        <ProblemBrowser problems={catalog} userId={session?.user?.id ?? null} />

        <SectionCard
          title="题型分区"
          subtitle="仍保留函数式题与传统题的分类说明，便于后续扩展"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-ui bg-panel-strong p-4">
              <h3 className="font-medium">{problemTypeLabel.FUNCTIONAL}</h3>
              <p className="mt-2 text-sm text-muted">
                适合练习函数签名、返回值验证与单测驱动提交。
              </p>
              <p className="mt-2 text-sm text-muted">
                当前题目数量：{partitioned.functional.length}
              </p>
            </div>
            <div className="rounded-2xl border border-ui bg-panel-strong p-4">
              <h3 className="font-medium">{problemTypeLabel.TRADITIONAL}</h3>
              <p className="mt-2 text-sm text-muted">
                适合练习标准输入输出、时空限制和批量评测。
              </p>
              <p className="mt-2 text-sm text-muted">
                当前题目数量：{partitioned.traditional.length}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </SiteShell>
  );
}
