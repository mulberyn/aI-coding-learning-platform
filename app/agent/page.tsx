import { Bot, Languages, Lightbulb, MessagesSquare } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { SectionCard } from "@/components/section-card";

const steps = [
  {
    icon: Lightbulb,
    title: "提示分级",
    text: "先给方向提示，再给局部线索，最后才给完整解法。",
  },
  {
    icon: MessagesSquare,
    title: "上下文注入",
    text: "把题目、提交记录、错误类型和历史对话作为上下文。",
  },
  {
    icon: Languages,
    title: "多模型切换",
    text: "统一适配国产大模型与 OpenAI Compatible 接口。",
  },
];

export default function AgentPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionCard
            title="Agent 设计"
            subtitle="把复杂对话转成可控的教学流程"
          >
            <div className="space-y-4">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="flex gap-4 rounded-2xl border border-ui bg-panel-strong p-4"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-ui bg-panel text-muted">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">{step.title}</h3>
                      <p className="mt-1 text-sm leading-7 text-muted">
                        {step.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="对话窗口"
            subtitle="这里后续可接真实流式输出和思维链脱敏展示"
          >
            <div className="space-y-4 rounded-3xl border border-ui bg-panel-strong p-5">
              <div className="max-w-[80%] rounded-2xl border border-ui bg-panel p-4 text-sm leading-7">
                先描述你卡住的地方，我会优先给提示，不直接给答案。
              </div>
              <div className="ml-auto max-w-[80%] rounded-2xl border border-ui bg-panel p-4 text-sm leading-7">
                我不知道怎么判断应该用哈希表还是双指针。
              </div>
              <div className="max-w-[85%] rounded-2xl border border-ui bg-panel p-4 text-sm leading-7">
                如果题目要求你在一次遍历中查找配对关系，通常先想到哈希表；如果数组是有序的并且只需要两端缩进，优先考虑双指针。
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button className="btn-inverse inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
                <Bot className="h-4 w-4" />
                发送
              </button>
              <button className="rounded-full border border-ui px-4 py-2 text-sm font-medium">
                切换模型
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </SiteShell>
  );
}
