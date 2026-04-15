import { Users, Settings2, School } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { SectionCard } from "@/components/section-card";

const adminItems = [
  { icon: Users, title: "用户管理", text: "区分学生、教师、管理员三类身份。" },
  {
    icon: School,
    title: "教学内容管理",
    text: "维护题库、知识点和推荐学习路径。",
  },
  {
    icon: Settings2,
    title: "平台配置",
    text: "管理模型供应商、评测服务和开关。",
  },
];

export default function AdminPage() {
  return (
    <SiteShell title="Admin" eyebrow="教师与管理员控制台">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionCard
          title="后台能力"
          subtitle="只做毕业设计必需的治理功能，不额外扩散复杂度"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-ui bg-panel text-muted">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </SiteShell>
  );
}
