"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-16 rounded-full border border-ui" />;
  }

  const activeTheme = theme === "system" ? resolvedTheme : theme;
  const nextTheme = activeTheme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className="inline-flex items-center gap-2 rounded-full border border-ui bg-panel px-3 py-1.5 text-xs text-muted transition hover:bg-panel-strong"
      title="切换黑白主题"
    >
      {activeTheme === "dark" ? (
        <>
          <Moon className="h-3.5 w-3.5" />
          深色
        </>
      ) : (
        <>
          <Sun className="h-3.5 w-3.5" />
          浅色
        </>
      )}
    </button>
  );
}
