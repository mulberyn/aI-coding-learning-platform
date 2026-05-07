import type { ForumBoard } from "@prisma/client";

export const FORUM_BOARD_OPTIONS: Array<{ value: ForumBoard; label: string }> =
  [
    { value: "SITE", label: "站务版" },
    { value: "JOB", label: "求职版" },
    { value: "ACADEMIC", label: "学术版" },
    { value: "PROBLEM", label: "题目版" },
  ];

export const FORUM_BOARD_LABEL_MAP: Record<ForumBoard, string> = {
  SITE: "站务版",
  JOB: "求职版",
  ACADEMIC: "学术版",
  PROBLEM: "题目版",
};

export function formatForumDate(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}
