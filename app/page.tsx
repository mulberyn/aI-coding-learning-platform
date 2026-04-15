import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { navItems, roleCards } from "@/lib/mock-data";
import { aiProviders } from "@/lib/providers";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <section className="rounded-3xl border border-ui bg-panel p-8">
        <p className="text-xs uppercase tracking-[0.4em] text-muted">
          AI Code Learning
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
          AI 辅助编程教育平台
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-muted">
          黑白极简风格的全栈教学平台原型，覆盖做题、评测、Agent
          辅导、学习分析与多角色管理。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="btn-inverse inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
          >
            进入平台
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/problems"
            className="inline-flex items-center rounded-full border border-ui bg-panel-strong px-5 py-2.5 text-sm font-medium"
          >
            进入题库
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-full border border-ui bg-panel-strong px-5 py-2.5 text-sm font-medium"
          >
            登录
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {roleCards.map((card) => (
          <div
            key={card.title}
            className="rounded-3xl border border-ui bg-panel p-5"
          >
            <p className="text-sm uppercase tracking-[0.25em] text-muted">
              {card.role}
            </p>
            <h3 className="mt-2 text-xl font-semibold">{card.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted">{card.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-ui bg-panel p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-muted">
            Multi-Model Adapter
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            面向国产大模型的统一接入层
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            用统一 provider 适配层屏蔽不同厂商 API
            差异，支持多模型切换与灰度策略。
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {aiProviders.map((provider) => (
            <div
              key={provider.name}
              className="rounded-3xl border border-ui bg-panel p-5"
            >
              <p className="text-sm text-muted">{provider.family}</p>
              <h3 className="mt-2 text-lg font-semibold">{provider.name}</h3>
              <p className="mt-2 text-sm text-muted">
                {provider.endpointStyle}
              </p>
              <p className="mt-3 text-sm text-muted">{provider.strength}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-ui bg-panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-muted">
              Navigation
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              从首页进入核心子系统
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-muted">
            当前版本已完成登录、题库分区、题目详情提交评测与轮询结果展示。
          </p>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-ui bg-panel-strong p-4 transition hover:bg-panel"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-medium">{item.label}</h3>
                <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-1 group-hover:text-current" />
              </div>
              <p className="mt-2 text-sm text-muted">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
