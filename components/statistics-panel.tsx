"use client";

import { Zap, HardDrive, Code } from "lucide-react";

type StatisticsPanelProps = {
  problemId: string;
};

export function StatisticsPanel({ problemId }: StatisticsPanelProps) {
  // 示例数据 - 按指标排序
  const fastestSubmissions = [
    { rank: 1, runtime: "12ms", language: "C++", user: "user123" },
    { rank: 2, runtime: "15ms", language: "C++", user: "user456" },
    { rank: 3, runtime: "18ms", language: "C++", user: "user789" },
  ];

  const memorySubmissions = [
    { rank: 1, memory: "2.1MB", language: "Python", user: "user123" },
    { rank: 2, memory: "2.3MB", language: "C++", user: "user456" },
    { rank: 3, memory: "2.5MB", language: "Python", user: "user789" },
  ];

  const codeSubmissions = [
    { rank: 1, lines: "45 行", language: "Python", user: "user123" },
    { rank: 2, lines: "52 行", language: "C++", user: "user456" },
    { rank: 3, lines: "58 行", language: "Java", user: "user789" },
  ];

  return (
    <div className="space-y-6">
      {/* 运行速度最快 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-foreground" />
          <h3 className="font-semibold text-foreground">运行速度最快</h3>
        </div>
        <div className="space-y-2">
          {fastestSubmissions.map((item) => (
            <div
              key={item.rank}
              className="flex items-center justify-between p-2 bg-panel-strong rounded-lg text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-muted">#{item.rank}</span>
                <span className="text-foreground font-medium">
                  {item.runtime}
                </span>
              </div>
              <span className="text-xs text-muted">{item.language}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 内存使用最少 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="h-4 w-4 text-foreground" />
          <h3 className="font-semibold text-foreground">内存使用最少</h3>
        </div>
        <div className="space-y-2">
          {memorySubmissions.map((item) => (
            <div
              key={item.rank}
              className="flex items-center justify-between p-2 bg-panel-strong rounded-lg text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-muted">#{item.rank}</span>
                <span className="text-foreground font-medium">
                  {item.memory}
                </span>
              </div>
              <span className="text-xs text-muted">{item.language}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 代码最短 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Code className="h-4 w-4 text-foreground" />
          <h3 className="font-semibold text-foreground">代码最短</h3>
        </div>
        <div className="space-y-2">
          {codeSubmissions.map((item) => (
            <div
              key={item.rank}
              className="flex items-center justify-between p-2 bg-panel-strong rounded-lg text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-muted">#{item.rank}</span>
                <span className="text-foreground font-medium">
                  {item.lines}
                </span>
              </div>
              <span className="text-xs text-muted">{item.language}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
