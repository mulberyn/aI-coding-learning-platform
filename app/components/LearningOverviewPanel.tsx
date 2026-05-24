import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BookOpen,
  RefreshCw,
  Sparkles,
  MessageSquareMore,
  Trophy,
  Cloud,
  Target,
  type LucideIcon,
} from "lucide-react";
import {
  refreshRecommendations,
  refreshWeeklyAiSummary,
} from "@/app/users/[id]/actions";

type MetricCard = {
  label: string;
  value: number;
  suffix: string;
  deltaLabel: string;
  deltaClassName: string;
  accentClassName: string;
  series: number[];
  helper: string;
  Icon: LucideIcon;
};

type RecommendationItem = {
  title: string;
  href: string;
  reason: string;
  meta: string;
};

type RecommendationGroup = {
  title: string;
  description: string;
  items: RecommendationItem[];
};

type LearningOverviewPanelProps = {
  userId: string;
  displayName: string;
  aiProviderLabel: string;
  aiModelLabel: string;
  aiSummary: string;
  aiSummaryUpdatedText: string;
  metrics: MetricCard[];
  weakModules: Array<{
    topic: string;
    attempts: number;
    passRate: number;
    weaknessScore: number;
  }>;
  recommendations: RecommendationGroup[];
};

function formatSeriesValue(value: number, suffix: string) {
  return `${value}${suffix}`;
}

function SectionTitle({
  Icon,
  title,
  description,
}: {
  Icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-ui bg-panel-strong text-current">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function getRecommendationGroupIcon(title: string) {
  if (title.includes("题目")) {
    return BookOpen;
  }
  if (title.includes("比赛")) {
    return Trophy;
  }
  return MessageSquareMore;
}

function getRecommendationItemIcon(href: string) {
  if (href.startsWith("/problems")) {
    return BookOpen;
  }
  if (href.startsWith("/contests")) {
    return Trophy;
  }
  return MessageSquareMore;
}

function getBubbleSize(weaknessScore: number) {
  if (weaknessScore >= 88) {
    return "h-44 w-44 sm:h-52 sm:w-52";
  }
  if (weaknessScore >= 72) {
    return "h-36 w-36 sm:h-44 sm:w-44";
  }
  if (weaknessScore >= 52) {
    return "h-30 w-30 sm:h-36 sm:w-36";
  }
  return "h-24 w-24 sm:h-30 sm:w-30";
}

function WeakModuleCloud({
  weakModules,
}: {
  weakModules: Array<{
    topic: string;
    attempts: number;
    passRate: number;
    weaknessScore: number;
  }>;
}) {
  const bubbleModules = weakModules.slice(0, 8);

  function getBubbleBackground(weaknessScore: number) {
    const clampedScore = Math.max(0, Math.min(100, weaknessScore));
    const greenRatio = 1 - clampedScore / 100;
    const red = Math.round(236 - greenRatio * 130);
    const green = Math.round(72 + greenRatio * 100);
    const blue = Math.round(72 + greenRatio * 28);
    const intensity = 0.34 + clampedScore / 150;

    return {
      background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.28), transparent 42%), linear-gradient(135deg, rgba(${red}, ${green}, ${blue}, ${Math.min(0.95, intensity)}), rgba(${Math.max(50, red - 35)}, ${Math.max(80, green - 28)}, ${Math.max(52, blue - 20)}, ${Math.max(0.22, intensity - 0.16)}))`,
    };
  }

  return (
    <div className="rounded-[10px] border border-ui bg-panel px-5 py-5">
      <SectionTitle
        Icon={Cloud}
        title="薄弱板块云图"
        description="气泡越大，表示该知识点越薄弱；优先补强气泡更明显的部分。"
      />

      <div className="mt-5 min-h-[260px] rounded-[10px] border border-ui bg-[linear-gradient(180deg,var(--bg),color-mix(in_srgb,var(--bg)_88%,transparent))] p-4 sm:min-h-[300px]">
        {bubbleModules.length > 0 ? (
          <div className="flex min-h-[220px] flex-wrap items-center justify-center gap-3 sm:min-h-[260px] sm:gap-4">
            {bubbleModules.map((module, index) => {
              const sizeClass = getBubbleSize(module.weaknessScore);
              const delay = `${index * 60}ms`;
              const labelBackground = getBubbleBackground(module.weaknessScore);

              return (
                <Link
                  key={module.topic}
                  href={`/problems/topics/${encodeURIComponent(module.topic)}`}
                  className={`group relative flex shrink-0 items-center justify-center rounded-full border border-white/20 text-center shadow-sm transition duration-300 ease-out hover:scale-105 hover:shadow-lg dark:border-white/10 ${sizeClass}`}
                  style={{
                    ...labelBackground,
                    transformOrigin: "center",
                    animationDelay: delay,
                  }}
                >
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full px-4 py-4 text-white">
                    <span className="text-sm font-medium leading-5 drop-shadow-sm sm:text-base">
                      {module.topic}
                    </span>
                    <span className="mt-2 text-xs text-white/85">
                      薄弱度 {module.weaknessScore}
                    </span>
                    <span className="mt-1 text-[11px] text-white/75">
                      {module.attempts} 次尝试 · 通过率{" "}
                      {Math.round(module.passRate * 100)}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[220px] items-center justify-center rounded-[10px] border border-dashed border-ui text-sm text-muted sm:min-h-[260px]">
            暂无足够数据生成薄弱板块云图
          </div>
        )}
      </div>
    </div>
  );
}

export function LearningOverviewPanel({
  userId,
  displayName,
  aiProviderLabel,
  aiModelLabel,
  aiSummary,
  aiSummaryUpdatedText,
  metrics,
  weakModules,
  recommendations,
}: LearningOverviewPanelProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.34em] text-muted">
              智学编程 · Learning Overview
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              学习概览
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted sm:text-[0.98rem]">
              为 {displayName} 汇总最近一周与四周的学习变化，AI
              评语与推荐内容会随着你的历史行为同步刷新。
            </p>
          </div>

          <div className="rounded-[10px] border border-ui bg-panel px-4 py-3 text-sm text-muted">
            <div className="flex items-center gap-2 text-current">
              <Bot className="h-4 w-4" />
              当前模型
            </div>
            <p className="mt-1 tabular-nums">
              {aiProviderLabel} / {aiModelLabel}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const trendTail = metric.series.at(-1) ?? 0;
            const trendStart = metric.series[0] ?? 0;
            return (
              <article
                key={metric.label}
                className="rounded-[10px] border border-ui bg-panel px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <metric.Icon className="h-4 w-4" />
                      {metric.label}
                    </div>
                    <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
                      {formatSeriesValue(metric.value, metric.suffix)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${metric.deltaClassName}`}
                  >
                    {metric.deltaLabel}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted">{metric.helper}</p>
                <div className="mt-4 h-px bg-border" />
                <p className="mt-3 text-xs text-muted">
                  趋势：
                  {trendStart === trendTail
                    ? "持平"
                    : trendTail > trendStart
                      ? "向上"
                      : "回落"}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <WeakModuleCloud weakModules={weakModules} />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[10px] border border-ui bg-panel px-5 py-5">
          <SectionTitle
            Icon={Bot}
            title="AI 评语"
            description="同一份评语会同步保存在个人中心和学习概览中，刷新后两处都会更新。"
          />

          <form action={refreshWeeklyAiSummary} className="mt-4">
            <input type="hidden" name="userId" value={userId} />
            <div className="rounded-[10px] border border-ui bg-[var(--bg)] px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-medium text-current">
                    {aiProviderLabel}
                  </span>
                  <span>{aiModelLabel}</span>
                </span>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-ui bg-panel-strong px-3 text-xs transition hover:bg-panel"
                  aria-label="刷新本周 AI 评语"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  刷新
                </button>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-current">
                {aiSummary}
              </p>
              <p className="mt-3 text-xs text-muted">
                最近刷新：{aiSummaryUpdatedText}
              </p>
            </div>
          </form>
        </article>

        <article className="rounded-[10px] border border-ui bg-panel px-5 py-5">
          <SectionTitle
            Icon={Target}
            title="智能推荐"
            description="结合启用中的大模型 API Key、提交轨迹和近期薄弱模块，给出题目、比赛与讨论帖推荐。"
          />

          <form action={refreshRecommendations} className="mt-4">
            <input type="hidden" name="userId" value={userId} />
            <div className="mb-4 flex justify-end">
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-ui bg-panel-strong px-3 text-xs transition hover:bg-panel"
                aria-label="刷新智能推荐"
              >
                <Sparkles className="h-3.5 w-3.5" />
                刷新推荐
              </button>
            </div>

            <div className="space-y-4">
              {recommendations.map((group) => (
                <div
                  key={group.title}
                  className="rounded-[10px] border border-ui bg-[var(--bg)] px-4 py-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-ui bg-panel-strong text-current">
                      {(() => {
                        const GroupIcon = getRecommendationGroupIcon(
                          group.title,
                        );
                        return <GroupIcon className="h-4 w-4" />;
                      })()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-medium tracking-tight">
                          {group.title}
                        </h3>
                        <span className="text-xs text-muted">
                          {group.description}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2">
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href as never}
                            className="group flex items-start gap-3 rounded-[10px] border border-transparent px-3 py-3 transition hover:border-ui hover:bg-panel-strong"
                          >
                            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-panel-strong text-current">
                              {(() => {
                                const ItemIcon = getRecommendationItemIcon(
                                  item.href,
                                );
                                return <ItemIcon className="h-4 w-4" />;
                              })()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <p className="truncate text-sm font-medium tracking-tight">
                                  {item.title}
                                </p>
                                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-current" />
                              </div>
                              <p className="mt-1 text-xs leading-6 text-muted">
                                {item.reason}
                              </p>
                              <p className="mt-1 text-xs text-current/80">
                                {item.meta}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </form>
        </article>
      </section>
    </div>
  );
}
