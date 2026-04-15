import Link from "next/link";
import { appRoutes } from "@/lib/route";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

type SiteShellProps = {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  requireAuth?: boolean;
};

export async function SiteShell({
  title,
  eyebrow,
  children,
  requireAuth = true,
}: SiteShellProps) {
  const session = await auth();

  if (requireAuth && !session?.user) {
    redirect("/login");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-ui bg-panel/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted">
              AI Code Learning
            </p>
            <h1 className="mt-1 text-xl font-semibold">{title}</h1>
            {eyebrow ? (
              <p className="mt-1 text-sm text-muted">{eyebrow}</p>
            ) : null}
          </div>
          <nav className="hidden gap-6 lg:flex">
            {appRoutes.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted transition hover:text-current"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
          {session?.user ? (
            <div className="ml-4 flex items-center gap-3">
              <div className="hidden text-right lg:block">
                <p className="text-sm">{session.user.name}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-muted">
                  {session.user.role}
                </p>
              </div>
              <form action={handleSignOut}>
                <button className="rounded-full border border-ui bg-panel px-3 py-1.5 text-xs transition hover:bg-panel-strong">
                  退出登录
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-4 rounded-full border border-ui bg-panel px-3 py-1.5 text-xs transition hover:bg-panel-strong"
            >
              登录
            </Link>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
