"use client";

import { useCallback, useMemo, useState } from "react";
import { Code2, Upload } from "lucide-react";
import { ProblemSubmitPanel } from "./problem-submit-panel";

type SubmissionMode = "code" | "file";

type SubmissionPanelProps = {
  problemSlug: string;
  problemType: "FUNCTIONAL" | "TRADITIONAL";
  defaultCode: string;
};

export function SubmissionPanel({
  problemSlug,
  problemType,
  defaultCode,
}: SubmissionPanelProps) {
  const [mode, setMode] = useState<SubmissionMode>("code");

  return (
    <div className="space-y-4">
      <div className="border-t-2 border-ui" />

      {/* 提交模式切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("code")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "code"
              ? "bg-panel-strong border border-ui text-foreground"
              : "bg-background border border-ui text-muted hover:text-foreground"
          }`}
        >
          <Code2 className="h-4 w-4" />
          代码提交
        </button>
        <button
          onClick={() => setMode("file")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "file"
              ? "bg-panel-strong border border-ui text-foreground"
              : "bg-background border border-ui text-muted hover:text-foreground"
          }`}
        >
          <Upload className="h-4 w-4" />
          文件提交
        </button>
      </div>

      {/* 内容区域 */}
      {mode === "code" ? (
        <ProblemSubmitPanel
          problemSlug={problemSlug}
          problemType={problemType}
          initialCode={defaultCode}
        />
      ) : (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-ui rounded-lg p-8 text-center">
            <Upload className="h-8 w-8 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted">拖放文件或点击选择</p>
            <p className="text-xs text-muted/70 mt-1">
              支持 C++、Python、Java 等常见编程语言的源文件
            </p>
          </div>
          <button className="w-full px-4 py-2 bg-panel-strong border border-ui rounded-lg font-medium text-foreground hover:bg-ui transition-colors">
            选择文件
          </button>
        </div>
      )}
    </div>
  );
}
