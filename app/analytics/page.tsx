import { ChartColumnBig, Route } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { SectionCard } from "@/components/section-card";

const insights = [
  "数组与哈希表掌握稳定，但滑动窗口在中等题中仍有连续失误。",
  "最近 7 天的练习频率提升，但提交后复盘行为偏少。",
  "AI 辅导有助于降低同类错误重复率，适合作为论文实验点。",
];

const pathItems = [
  "数组基础",
  "哈希表技巧",
  "滑动窗口",
  "二分查找",
  "图论入门",
];

export default function AnalyticsPage() {
  return (
    <SiteShell>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <SectionCard title="学习画像" subtitle="用简单可解释的统计分析先跑通">
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight}
                className="flex gap-3 rounded-2xl border border-ui bg-panel-strong p-4 text-sm leading-7"
              >
                <ChartColumnBig className="mt-1 h-4 w-4 shrink-0 text-muted" />
                <p>{insight}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="推荐学习路径"
          subtitle="先按难度递进与薄弱知识点排序"
        >
          <div className="space-y-3">
            {pathItems.map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-4 rounded-2xl border border-ui bg-panel-strong p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-ui bg-panel text-sm text-muted">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-medium">{item}</h3>
                  <p className="text-sm text-muted">
                    基于错题与通过率自动生成的下一步训练项
                  </p>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-ui bg-panel-strong p-4 text-sm">
              <Route className="mb-2 h-4 w-4" />
              这个模块后续可以扩展为更复杂的个性化推荐算法，但首版先用规则模型更稳。
            </div>
          </div>
        </SectionCard>
      </div>
    </SiteShell>
  );
}
