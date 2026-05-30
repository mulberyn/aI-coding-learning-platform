"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bot,
  BookOpen,
  ChartColumnBig,
  FolderOpen,
  Home,
  LogOut,
  MessageSquare,
  MessageSquareMore,
  Monitor,
  Moon,
  Video,
  Sun,
  Trophy,
  Route as RouteIcon,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import type { Route } from "next";
import { appRoutes } from "@/lib/route";

type RouteChildItem = {
  href: Route;
  label: string;
};

type RouteItem = {
  href: Route;
  label: string;
  children?: RouteChildItem[];
};

type NavLinkProps = {
  route: RouteItem;
  active: boolean;
  Icon: LucideIcon;
};

type TopNavBarProps = {
  routes?: RouteItem[];
  signedIn?: boolean;
  userId?: string;
  userName?: string | null;
  onSignOut?: (formData: FormData) => Promise<void>;
};

const navIcons: Record<string, LucideIcon> = {
  "/": Home,
  "/problems": BookOpen,
  "/videos": Video,
  "/analytics": Bot,
  "/submissions": FolderOpen,
  "/contests": Trophy,
  "/forum": MessageSquare,
};

const childIcons: Record<string, LucideIcon> = {
  "/analytics": ChartColumnBig,
  "/learn/route": RouteIcon,
  "/learn/chat": MessageSquareMore,
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
      href={route.href}
      aria-current={active ? "page" : undefined}
      className={`group relative inline-flex h-12 items-center gap-2 px-3 text-sm font-medium transition-colors duration-200 ${
        active ? "text-current" : "text-muted hover:text-current"
      }`}
    >
      <Icon className="relative z-10 h-4 w-4" />
      <span className="relative z-10">{route.label}</span>
      {active ? (
        <motion.span
          layoutId="top-nav-active-pill"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-2 -bottom-[1px] h-[3px] rounded-full bg-current shadow-[0_0_14px_rgba(0,0,0,0.22)] dark:shadow-[0_0_14px_rgba(255,255,255,0.22)]"
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
      ) : null}
    </Link>
  );
}

function LearningNavItem({
  route,
  active,
  Icon,
  pathname,
}: NavLinkProps & { route: RouteItem; pathname: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOpen(false);
  }, [active]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div
      ref={menuRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        className={`group relative inline-flex h-12 items-center gap-2 px-3 text-sm font-medium transition-colors duration-200 ${
          active ? "text-current" : "text-muted hover:text-current"
        }`}
        onClick={(e) => {
          e.preventDefault();
        }}
      >
        <Icon className="relative z-10 h-4 w-4" />
        <span className="relative z-10">{route.label}</span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="relative z-10 inline-flex"
        >
          <svg
            viewBox="0 0 20 20"
            className="h-3.5 w-3.5 fill-current opacity-70"
            aria-hidden="true"
          >
            <path d="M5.25 7.5 10 12.25 14.75 7.5l1.06 1.06L10 14.37 3.94 8.56z" />
          </svg>
        </motion.span>
        {active ? (
          <motion.span
            layoutId="top-nav-active-pill"
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 -bottom-[1px] h-[3px] rounded-full bg-current shadow-[0_0_14px_rgba(0,0,0,0.22)] dark:shadow-[0_0_14px_rgba(255,255,255,0.22)]"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />
        ) : null}
      </button>

      <AnimatePresence>
        {open && route.children?.length ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-[10px] border border-ui bg-panel-strong p-2 shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur-md"
          >
            {route.children.map((child) => {
              const childActive = isRouteActive(child.href, pathname);
              const ChildIcon = childIcons[child.href] ?? Bot;
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm transition-colors hover:bg-panel-strong ${
                    childActive ? "bg-panel-strong text-current" : "text-muted"
                  }`}
                >
                  <ChildIcon className="h-4 w-4 shrink-0" />
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
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
      className="inline-flex h-9 w-9 items-center justify-center rounded-[7px] border border-ui bg-panel-strong text-muted transition hover:text-current"
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
  routes = appRoutes,
  signedIn = false,
  userId,
  userName,
  onSignOut,
}: TopNavBarProps) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeHref = routes.find(
    (route) =>
      isRouteActive(route.href, pathname) ||
      route.children?.some((child) => isRouteActive(child.href, pathname)),
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
      const target = event.target;
      if (
        target instanceof Node &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b border-black/5 bg-[var(--bg)]/94 shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_28px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-transform duration-300 ease-out dark:border-white/10 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-ui bg-panel-strong text-current">
              <Bot className="h-4 w-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              智学编程
            </span>
          </Link>
        </div>

        <div className="pointer-events-none absolute inset-x-0 hidden h-14 items-center justify-center md:flex">
          <nav
            className="pointer-events-auto flex h-14 items-center gap-1.5"
            aria-label="主导航"
          >
            {routes.map((route) => {
              const active = Boolean(
                isRouteActive(route.href, pathname) ||
                route.children?.some((child) =>
                  isRouteActive(child.href, pathname),
                ),
              );
              const Icon = navIcons[route.href] ?? Home;

              if (route.children?.length) {
                return (
                  <LearningNavItem
                    key={route.href}
                    route={route}
                    active={active}
                    Icon={Icon}
                    pathname={pathname}
                  />
                );
              }

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
                className="inline-flex h-9 items-center rounded-[7px] border border-ui bg-[#e5e7eb] px-3 text-sm text-[#111827] transition hover:bg-[#d1d5db]"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center rounded-[7px] border border-ui bg-[#dbeafe] px-3 text-sm text-[#1d4ed8] transition hover:bg-[#bfdbfe]"
              >
                注册
              </Link>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[7px] border border-ui bg-panel-strong text-sm font-semibold"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="打开用户菜单"
              >
                {getUserInitial(userName)}
              </button>

              {menuOpen ? (
                <div
                  className="absolute right-0 top-11 w-40 overflow-hidden rounded-[10px] border border-ui bg-panel-strong py-1 shadow-[0_18px_34px_rgba(0,0,0,0.12)] backdrop-blur-md"
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
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted transition hover:bg-panel-strong hover:text-current"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4" />
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
      <div className="h-[1px] bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-white/10" />
    </header>
  );
}
