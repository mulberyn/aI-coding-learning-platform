"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FolderOpen,
  Home,
  MessageSquare,
  Monitor,
  Moon,
  Sun,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

type RouteItem = {
  href: string;
  label: string;
};

type NavLinkProps = {
  route: RouteItem;
  active: boolean;
  Icon: LucideIcon;
};

type TopNavBarProps = {
  routes: RouteItem[];
  signedIn: boolean;
  userId?: string;
  userName?: string | null;
  onSignOut?: (formData: FormData) => Promise<void>;
};

const navIcons: Record<string, LucideIcon> = {
  "/": Home,
  "/problems": BookOpen,
  "/submissions": FolderOpen,
  "/contests": Trophy,
  "/forum": MessageSquare,
};

function isRouteActive(routeHref: string, pathname: string) {
  if (routeHref === "/") {
    return pathname === "/";
  }

  return pathname === routeHref || pathname.startsWith(`${routeHref}/`);
}

function NavLink({ route, active, Icon }: NavLinkProps) {
  return (
    <Link
      href={route.href as never}
      aria-current={active ? "page" : undefined}
      className={`group relative inline-flex h-12 items-center px-3 text-sm transition-colors duration-200 ${
        active ? "text-current" : "text-muted hover:text-current"
      }`}
    >
      <span className="relative inline-flex items-center gap-1.5 leading-none">
        <motion.span
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-md blur-md ${
            active
              ? "bg-black/20 dark:bg-white/20"
              : "bg-black/10 dark:bg-white/10"
          }`}
          initial={false}
          animate={{ opacity: active ? 1 : 0, scaleX: active ? 1 : 0.94 }}
          whileHover={{ opacity: active ? 1 : 0.85 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "center" }}
        />

        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 -bottom-[12px] h-[3px] rounded-full bg-black shadow-[0_0_14px_rgba(0,0,0,0.22)] dark:bg-white dark:shadow-[0_0_14px_rgba(255,255,255,0.22)]"
          initial={false}
          animate={{ opacity: active ? 1 : 0, scaleX: active ? 1 : 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "center" }}
        />

        <Icon className="relative z-10 h-3.5 w-3.5" />
        <span className="relative z-10">{route.label}</span>
      </span>
    </Link>
  );
}

function ThemeModeButton() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="h-9 w-9 rounded-[7px] bg-panel-strong"
        aria-label="主题模式加载中"
      />
    );
  }

  const mode: "system" | "light" | "dark" =
    theme === "light" || theme === "dark" ? theme : "system";

  function nextMode() {
    if (mode === "system") {
      return "light";
    }
    if (mode === "light") {
      return "dark";
    }
    return "system";
  }

  const titleMap = {
    system: "系统主题",
    light: "浅色模式",
    dark: "深色模式",
  } as const;

  return (
    <button
      type="button"
      onClick={() => setTheme(nextMode())}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[7px] bg-panel-strong text-muted transition hover:text-current"
      title={`当前：${titleMap[mode]}`}
      aria-label={`切换主题，当前${titleMap[mode]}`}
    >
      {mode === "system" ? (
        <Monitor className="h-4 w-4" />
      ) : mode === "light" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

function getUserInitial(name?: string | null) {
  if (!name) {
    return "U";
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return "U";
  }

  return trimmed.slice(0, 1).toUpperCase();
}

export function TopNavBar({
  routes,
  signedIn,
  userId,
  userName,
  onSignOut,
}: TopNavBarProps) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeHref = routes.find((route) =>
    isRouteActive(route.href, pathname),
  )?.href;

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const onScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 12) {
        setHidden(false);
        lastScrollY = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY + 10) {
        setHidden(true);
      } else if (currentScrollY < lastScrollY - 10) {
        setHidden(false);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 bg-[var(--bg)]/95 backdrop-blur-xl transition-transform duration-300 ease-out ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="relative mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">
            AIOJ
          </Link>
        </div>

        <div className="pointer-events-none absolute inset-x-0 hidden h-12 items-center justify-center md:flex">
          <nav
            className="pointer-events-auto flex h-12 items-center gap-1"
            aria-label="主导航"
          >
            {routes.map((route) => {
              const active = route.href === activeHref;
              const Icon = navIcons[route.href] ?? Home;
              return (
                <NavLink
                  key={route.href}
                  route={route}
                  active={active}
                  Icon={Icon}
                />
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeModeButton />

          {!signedIn ? (
            <>
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-[7px] bg-[#e5e7eb] px-3 text-sm text-[#111827] transition hover:bg-[#d1d5db]"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center rounded-[7px] bg-[#dbeafe] px-3 text-sm text-[#1d4ed8] transition hover:bg-[#bfdbfe]"
              >
                注册
              </Link>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[7px] bg-panel-strong text-sm font-semibold"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="打开用户菜单"
              >
                {getUserInitial(userName)}
              </button>

              {menuOpen ? (
                <div
                  className="absolute right-0 top-11 w-40 overflow-hidden rounded-[9px] bg-panel py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-black/5 dark:ring-white/10"
                  role="menu"
                >
                  <Link
                    href={userId ? `/users/${userId}` : "/dashboard"}
                    className="block px-3 py-2 text-sm text-muted transition hover:bg-panel-strong hover:text-current"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    个人中心
                  </Link>
                  <Link
                    href={userId ? `/users/${userId}/settings` : "/dashboard"}
                    className="block px-3 py-2 text-sm text-muted transition hover:bg-panel-strong hover:text-current"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    设置
                  </Link>
                  {onSignOut ? (
                    <form action={onSignOut}>
                      <button
                        type="submit"
                        className="block w-full px-3 py-2 text-left text-sm text-muted transition hover:bg-panel-strong hover:text-current"
                        role="menuitem"
                      >
                        退出登录
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
      <div className="h-px bg-[var(--border)]" />
      <div className="h-[2px] bg-gradient-to-b from-black/10 to-transparent dark:from-white/10" />
    </header>
  );
}
