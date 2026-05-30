import type { Route } from "next";

export const appRoutes = [
  { href: "/" as Route, label: "首页" },
  { href: "/problems" as Route, label: "题库" },
  { href: "/videos" as Route, label: "视频" },
  {
    href: "/analytics" as Route,
    label: "学习",
    children: [
      { href: "/analytics" as Route, label: "学习概览" },
      { href: "/learn/route" as Route, label: "学习路线" },
      { href: "/learn/chat" as Route, label: "AI对话" },
    ],
  },
  { href: "/submissions" as Route, label: "提交记录" },
  { href: "/contests" as Route, label: "比赛" },
  { href: "/forum" as Route, label: "论坛" },
];
