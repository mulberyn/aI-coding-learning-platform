import Link from "next/link";
import { ArrowRight } from "lucide-react";

type ProblemSidebarProps = {
  problemId: string;
  problemSlug: string;
  problemType: "FUNCTIONAL" | "TRADITIONAL";
};

export function ProblemSidebar({
  problemId,
  problemSlug,
  problemType,
}: ProblemSidebarProps) {
  const links = [
    {
      label: "提交",
      href: {
        pathname: "/submit",
        query: { problemSlug, problemType },
      },
    },
    {
      label: "提交记录",
      href: {
        pathname: "/submit-history",
        query: { problemId, problemSlug },
      },
    },
    {
      label: "学习",
      href: {
        pathname: "/learn",
        query: { problemId, problemSlug },
      },
    },
    {
      label: "统计",
      href: {
        pathname: "/statistics",
        query: { problemId, problemSlug },
      },
    },
    {
      label: "讨论",
      href: {
        pathname: "/discussion",
        query: { problemId, problemSlug },
      },
    },
  ];

  return (
    <aside className="w-full">
      <div className="overflow-hidden rounded-xl border border-ui bg-background">
        {links.map((item, index) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex h-12 items-center justify-between px-4 text-sm font-medium text-foreground transition-colors hover:bg-panel-strong ${
              index !== links.length - 1 ? "border-b border-ui" : ""
            }`}
          >
            <span>{item.label}</span>
            <ArrowRight className="h-4 w-4 text-muted" />
          </Link>
        ))}
      </div>
    </aside>
  );
}
