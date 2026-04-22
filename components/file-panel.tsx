"use client";

import { FileCode } from "lucide-react";

type FilePanelProps = {
  problemId: string;
};

export function FilePanel({ problemId }: FilePanelProps) {
  const files = [
    {
      name: "solution.cpp",
      size: "2.1 KB",
      modified: "2 小时前",
    },
    {
      name: "solution.py",
      size: "1.8 KB",
      modified: "3 小时前",
    },
    {
      name: "solution.java",
      size: "2.5 KB",
      modified: "5 小时前",
    },
  ];

  return (
    <div className="space-y-3">
      <button className="w-full px-4 py-2 bg-panel-strong border border-ui rounded-lg font-medium text-foreground hover:bg-ui transition-colors">
        上传文件
      </button>

      {files.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">暂无文件</p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.name}
              className="flex items-center gap-3 p-3 bg-panel-strong border border-ui rounded-lg hover:bg-ui transition-colors cursor-pointer"
            >
              <FileCode className="h-4 w-4 text-muted flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {file.name}
                </p>
                <p className="text-xs text-muted">
                  {file.size} · {file.modified}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
