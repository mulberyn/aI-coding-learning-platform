import { SiteShell } from "@/components/site-shell";
import { SectionCard } from "@/components/section-card";
import { StatGrid } from "@/components/stat-grid";
import { roleCards } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <StatGrid />
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="角色入口" subtitle="按用户身份展示不同能力范围">
            <div className="grid gap-4 md:grid-cols-3">
              {roleCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-ui bg-panel-strong p-4"
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">
                    {card.role}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{card.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard
            title="本周学习目标"
            subtitle="建议从薄弱知识点切入的练习路径"
          >
            <div className="space-y-3 text-sm">
              <div className="rounded-2xl border border-ui bg-panel-strong p-4">
                完成 3 道数组 / 哈希表题
              </div>
              <div className="rounded-2xl border border-ui bg-panel-strong p-4">
                通过 2 次 AI 辅导修正同类错误
              </div>
              <div className="rounded-2xl border border-ui bg-panel-strong p-4">
                查看一次学习画像并确认推荐路径
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </SiteShell>
  );
}
