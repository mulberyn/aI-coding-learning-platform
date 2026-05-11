"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Circle, Sparkles } from "lucide-react";

type HomeCheckInCalendarProps = {
  signedIn: boolean;
  userId?: string;
  todayIso: string;
  contestName: string;
  contestDateLabel: string;
  daysUntilContest: number;
};

type CalendarCell = {
  key: string;
  date: Date;
  label: number;
  inCurrentMonth: boolean;
  isToday: boolean;
};

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCalendarCells(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: CalendarCell[] = [];
  const todayKey = dateKey(baseDate);

  for (let index = startOffset; index > 0; index -= 1) {
    const date = new Date(year, month, 1 - index);
    cells.push({
      key: `prev-${index}`,
      date,
      label: date.getDate(),
      inCurrentMonth: false,
      isToday: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = dateKey(date);

    cells.push({
      key,
      date,
      label: day,
      inCurrentMonth: true,
      isToday: key === todayKey,
    });
  }

  while (cells.length % 7 !== 0) {
    const trailingIndex = cells.length - startOffset - daysInMonth + 1;
    const date = new Date(year, month + 1, trailingIndex);
    cells.push({
      key: `next-${cells.length}`,
      date,
      label: date.getDate(),
      inCurrentMonth: false,
      isToday: false,
    });
  }

  return cells;
}

export function HomeCheckInCalendar({
  signedIn,
  userId,
  todayIso,
  contestName,
  contestDateLabel,
  daysUntilContest,
}: HomeCheckInCalendarProps) {
  const today = useMemo(() => new Date(todayIso), [todayIso]);
  const storageKey = userId ? `aioj-home-checkins:${userId}` : undefined;
  const [mounted, setMounted] = useState(false);
  const [checkInKeys, setCheckInKeys] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !storageKey) {
      return;
    }

    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return;
    }

    try {
      const parsed = JSON.parse(rawValue) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === "string")
      ) {
        setCheckInKeys(parsed);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [mounted, storageKey]);

  useEffect(() => {
    if (!mounted || !storageKey) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(checkInKeys));
  }, [checkInKeys, mounted, storageKey]);

  const calendarCells = useMemo(() => buildCalendarCells(today), [today]);
  const checkedInSet = useMemo(() => new Set(checkInKeys), [checkInKeys]);
  const todayKey = dateKey(today);
  const hasCheckedInToday = checkedInSet.has(todayKey);
  const completedCount = checkInKeys.length;

  function handleCheckIn() {
    if (!signedIn) {
      return;
    }

    if (hasCheckedInToday) {
      setFeedback("今天已经打卡过了");
      return;
    }

    setCheckInKeys((current) => [...current, todayKey]);
    setFeedback("已记录今天的打卡");
  }

  return (
    <aside
      id="checkin-calendar"
      className="rounded-[22px] border border-ui bg-panel/95 px-5 py-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-muted">
            学习日历
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            距离 {contestName}
          </h2>
        </div>
        <div className="rounded-full border border-ui bg-panel-strong px-3 py-1 text-xs text-muted">
          {daysUntilContest} 天
        </div>
      </div>

      <div className="mt-4 rounded-[16px] border border-ui bg-panel px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {contestDateLabel}
            </p>
            <p className="mt-1 text-xs text-muted">
              今天的学习进度会同步到日历上
            </p>
          </div>
          {signedIn ? (
            <button
              type="button"
              onClick={handleCheckIn}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#dbeafe] px-3 py-2 text-sm font-medium text-[#1d4ed8] transition hover:bg-[#bfdbfe]"
            >
              <CheckCircle2 className="h-4 w-4" />
              {hasCheckedInToday ? "今日已打卡" : "今日打卡"}
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-[10px] bg-panel-strong px-3 py-2 text-sm text-muted">
              <CalendarDays className="h-4 w-4" />
              登录后可打卡
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
          {["日", "一", "二", "三", "四", "五", "六"].map((weekday) => (
            <div key={weekday} className="py-1">
              {weekday}
            </div>
          ))}

          {calendarCells.map((cell) => {
            const isCheckedIn = checkedInSet.has(dateKey(cell.date));
            const isPast =
              cell.date.getTime() < today.getTime() && !cell.isToday;

            return (
              <div
                key={cell.key}
                className={`flex aspect-square items-center justify-center rounded-[10px] border text-xs transition ${
                  cell.inCurrentMonth
                    ? "border-ui bg-background text-foreground"
                    : "border-dashed border-ui bg-panel-strong/60 text-muted"
                } ${cell.isToday ? "ring-1 ring-inset ring-primary/40" : ""}`}
              >
                <div className="flex flex-col items-center justify-center gap-1 leading-none">
                  <span className={cell.inCurrentMonth ? "font-medium" : ""}>
                    {cell.label}
                  </span>
                  {cell.inCurrentMonth ? (
                    isCheckedIn ? (
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    ) : isPast ? (
                      <span className="h-2 w-2 rounded-full bg-zinc-400/70" />
                    ) : cell.isToday ? (
                      <span className="h-2 w-2 rounded-full bg-sky-500" />
                    ) : (
                      <Circle className="h-2.5 w-2.5 text-muted/70" />
                    )
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            已打卡
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-400/70" />
            未打卡
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            今日重点
          </span>
        </div>

        {signedIn ? (
          <div className="mt-4 border-t border-ui pt-4 text-sm text-muted">
            当前已记录 {completedCount} 天打卡，继续保持节奏。
            {feedback ? (
              <span className="ml-2 text-primary">{feedback}</span>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 border-t border-ui pt-4 text-sm text-muted">
            登录后即可把每日打卡同步到这个日历里。
          </div>
        )}
      </div>
    </aside>
  );
}
