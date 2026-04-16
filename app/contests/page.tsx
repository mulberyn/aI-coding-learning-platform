import { SiteShell } from "@/components/site-shell";
import { SectionCard } from "@/components/section-card";

const contests = [
  {
    title: "周赛 01",
    status: "报名中",
    text: "围绕数组与哈希表设计的入门赛，适合新生快速上手。",
  },
  {
    title: "班级排位赛",
    status: "筹备中",
    text: "支持班级排名、奖惩反馈和教师点评。",
  },
  {
    title: "算法挑战赛",
    status: "规划中",
    text: "后续可扩展成正式比赛模块，接入实时榜单与题面管控。",
  },
];

export default function ContestsPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionCard
          title="比赛中心"
          subtitle="当前先提供占位页，后续可接入完整赛制"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {contests.map((contest) => (
              <div
                key={contest.title}
                className="rounded-2xl border border-ui bg-panel-strong p-4"
              >
                <p className="text-xs uppercase tracking-[0.25em] text-muted">
                  {contest.status}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{contest.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">
                  {contest.text}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </SiteShell>
  );
}
