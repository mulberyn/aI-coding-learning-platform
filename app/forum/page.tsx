import { MessageSquareMore, Search } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { SectionCard } from "@/components/section-card";

const topics = [
  "Two Sum 的哈希表写法为什么比暴力解更适合做启发式提示？",
  "动态规划题目如何设计 Agent 的分步提问？",
  "老师如何查看班级薄弱知识点分布？",
];

export default function ForumPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionCard
          title="讨论区"
          subtitle="可以先做成轻社区，避免陷入复杂 IM 和实时协作"
        >
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 p-3 text-slate-400">
              <Search className="h-4 w-4" />
              搜索题目、知识点或讨论内容
            </div>
            <div className="mt-4 space-y-3">
              {topics.map((topic) => (
                <div
                  key={topic}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start gap-3">
                    <MessageSquareMore className="mt-1 h-4 w-4 text-muted" />
                    <p className="text-sm leading-7 text-slate-300">{topic}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </SiteShell>
  );
}
