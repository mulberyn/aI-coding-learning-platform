import type { Route } from "next";

export type Role = "student" | "teacher" | "admin";

export type NavItem = {
  label: string;
  href: Route;
  description: string;
};

export type Problem = {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
  acceptance: string;
  source: string;
};

export type LearningMetric = {
  label: string;
  value: string;
  change: string;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", description: "学习总览与角色入口" },
  { label: "Problems", href: "/problems", description: "题库、提交和评测" },
  { label: "Agent", href: "/agent", description: "AI 在线辅导" },
  { label: "Analytics", href: "/analytics", description: "学习画像与推荐" },
  { label: "Forum", href: "/forum", description: "题目讨论与交流" },
  { label: "Admin", href: "/admin", description: "教师与管理员控制台" },
];

export const problems: Problem[] = [
  {
    id: "two-sum",
    title: "Two Sum Rebuild",
    difficulty: "Easy",
    topic: "数组",
    acceptance: "89%",
    source: "基础训练",
  },
  {
    id: "longest-substring",
    title: "Longest Substring Window",
    difficulty: "Medium",
    topic: "滑动窗口",
    acceptance: "63%",
    source: "核心路径",
  },
  {
    id: "graph-path",
    title: "Minimum Cost Path",
    difficulty: "Hard",
    topic: "图论",
    acceptance: "38%",
    source: "进阶挑战",
  },
];

export const metrics: LearningMetric[] = [
  { label: "完成题目", value: "128", change: "+12 本周" },
  { label: "掌握知识点", value: "24", change: "+3 本周" },
  { label: "AI 辅导轮次", value: "46", change: "+9 本周" },
  { label: "薄弱模块", value: "2", change: "持续下降" },
];

export const roleCards: Array<{ title: string; role: Role; body: string }> = [
  {
    title: "学生视图",
    role: "student",
    body: "做题、写代码、问 Agent、看推荐路径。",
  },
  {
    title: "教师视图",
    role: "teacher",
    body: "发布题目、查看班级学习情况、跟踪薄弱点。",
  },
  {
    title: "管理员视图",
    role: "admin",
    body: "管理用户、内容审核、平台配置与数据概览。",
  },
];
