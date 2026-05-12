import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ChartColumnBig,
  BookOpen,
  RefreshCw,
  Sparkles,
  MessageSquareMore,
  Trophy,
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
  recommendations: RecommendationGroup[];
};

function formatSeriesValue(value: number, suffix: string) {
  return `${value}${suffix}`;
}

function buildSparklinePoints(values: number[]) {
  if (values.length === 0) {
    return "";
  }

  const maxValue = Math.max(...values, 1);
  const width = 100;
  const height = 36;
  const step = values.length === 1 ? width : width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = index * step;
      const normalized = value / maxValue;
      const y = height - normalized * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function Sparkline({
  values,
  accentClassName,
}: {
  values: number[];
  accentClassName: string;
}) {
  return (
    <div className="rounded-[8px] bg-panel-strong/70 px-3 py-3">
      <svg
        viewBox="0 0 100 36"
        className={`h-10 w-full ${accentClassName}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sparkline-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={buildSparklinePoints(values)}
        />
      </svg>
    </div>
  );
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

export function LearningOverviewPanel({
  userId,
  displayName,
  aiProviderLabel,
  aiModelLabel,
  aiSummary,
  aiSummaryUpdatedText,
  metrics,
  recommendations,
}: LearningOverviewPanelProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.34em] text-muted">
              AIOJ · Learning Overview
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

      <section className="mt-8 space-y-5">
        <SectionTitle
          Icon={ChartColumnBig}
          title="最近四周趋势"
          description="每个指标都用四周数据绘制成轻量折线，方便快速看出节奏变化。"
        />

        <div className="grid gap-3 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article
              key={`${metric.label}-trend`}
              className="rounded-[10px] border border-ui bg-panel px-4 py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{metric.label}</p>
                  <p className="mt-1 text-xs text-muted">近四周走势</p>
                </div>
                <metric.Icon className="h-4 w-4 text-muted" />
              </div>

              <div className="mt-4">
                <Sparkline
                  values={metric.series}
                  accentClassName={metric.accentClassName}
                />
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-[11px] text-muted tabular-nums">
                {metric.series.map((value, index) => (
                  <div
                    key={`${metric.label}-${index}`}
                    className="rounded-[10px] bg-panel-strong/70 px-2 py-2 text-center"
                  >
                    <p>
                      {index === metric.series.length - 1
                        ? "本周"
                        : `${metric.series.length - index} 周前`}
                    </p>
                    <p className="mt-1 text-current">
                      {formatSeriesValue(value, metric.suffix)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
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
