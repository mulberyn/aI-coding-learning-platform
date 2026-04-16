import type { Route } from "next";

export const appRoutes = [
  { href: "/" as Route, label: "首页" },
  { href: "/problems" as Route, label: "题库" },
  { href: "/submissions" as Route, label: "提交记录" },
  { href: "/contests" as Route, label: "比赛" },
  { href: "/forum" as Route, label: "论坛" },
];
