"use client";

import { MessageCircle } from "lucide-react";

type DiscussionPanelProps = {
  problemId: string;
};

export function DiscussionPanel({ problemId }: DiscussionPanelProps) {
  return (
    <div className="space-y-4">
      <div className="text-center py-8">
        <MessageCircle className="h-8 w-8 text-muted mx-auto mb-2 opacity-50" />
        <p className="text-sm text-muted">讨论区功能敬请期待</p>
      </div>
      <button className="w-full px-4 py-2 bg-panel-strong border border-ui rounded-lg font-medium text-foreground hover:bg-ui transition-colors">
        进入完整讨论区
      </button>
    </div>
  );
}
