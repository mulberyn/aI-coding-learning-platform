"use client";

import { useEffect, useRef } from "react";
import { Flame } from "lucide-react";

interface HeatmapSectionProps {
  heatMonthSegments: Array<{ label: string; start: number; width: number }>;
  heatWeeks: Array<Array<{ dayKey: string; date: Date; count: number }>>;
  maxHeatCount: number;
}

function getHeatColor(count: number, maxCount: number) {
  if (count <= 0) return "bg-panel-strong";
  const ratio = maxCount <= 0 ? 0 : count / maxCount;
  if (ratio < 0.26) return "bg-emerald-200 dark:bg-emerald-900/40";
  if (ratio < 0.51) return "bg-emerald-300 dark:bg-emerald-800/55";
  if (ratio < 0.76) return "bg-emerald-500 dark:bg-emerald-700/80";
  return "bg-emerald-600 dark:bg-emerald-500";
}

export function HeatmapSection({
  heatMonthSegments,
  heatWeeks,
  maxHeatCount,
}: HeatmapSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 页面加载后滚到最右侧
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft =
        scrollContainerRef.current.scrollWidth;
    }
  }, []);

  const weekCount = heatWeeks.length;

  return (
    <div className="rounded-md border border-ui bg-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Flame className="h-4 w-4" />
          提交热力图
        </div>
      </div>

      <div ref={scrollContainerRef} className="mt-4 w-full overflow-x-auto">
        <div style={{ minWidth: "min-content" }}>
          <div className="w-full">
            <div className="relative mb-1 ml-6 h-4 text-[10px] leading-none text-muted">
              {heatMonthSegments.map((segment) => (
                <span
                  key={`${segment.label}-${segment.start}`}
                  className="absolute overflow-hidden whitespace-nowrap pr-1"
                  style={{
                    left: `${segment.start * 13}px`,
                    width: `${segment.width * 13}px`,
                  }}
                >
                  {segment.label}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="grid grid-rows-7 gap-[3px] pt-[1px] text-[10px] text-muted">
                <span>一</span>
                <span />
                <span>三</span>
                <span />
                <span>五</span>
                <span />
                <span />
              </div>

              <div
                className="grid gap-[3px]"
                style={{
                  gridTemplateColumns: `repeat(${weekCount}, 10px)`,
                }}
              >
                {heatWeeks.map((week, weekIndex) => (
                  <div
                    key={`week-${weekIndex}`}
                    className="grid grid-rows-7 gap-[3px]"
                  >
                    {week.map((item) => (
                      <div
                        key={item.dayKey}
                        className={`h-[10px] w-[10px] rounded-[2px] ${getHeatColor(
                          item.count,
                          maxHeatCount,
                        )}`}
                        title={`${item.dayKey} · ${item.count} 次提交`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <span>少</span>
        <span className="h-3 w-3 rounded bg-panel-strong" />
        <span className="h-3 w-3 rounded bg-emerald-200 dark:bg-emerald-900/40" />
        <span className="h-3 w-3 rounded bg-emerald-300 dark:bg-emerald-800/55" />
        <span className="h-3 w-3 rounded bg-emerald-500 dark:bg-emerald-700/80" />
        <span className="h-3 w-3 rounded bg-emerald-600 dark:bg-emerald-500" />
        <span>多</span>
      </div>
    </div>
  );
}
