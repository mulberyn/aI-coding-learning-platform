import { appRoutes } from "@/lib/route";
import { auth } from "@/auth";
import { handleSignOut } from "@/components/actions/authActions";
import { redirect } from "next/navigation";
import { TopNavBar } from "@/app/components/TopNavBar";

type SiteShellProps = {
  children: React.ReactNode;
  requireAuth?: boolean;
};

export async function SiteShell({
  children,
  requireAuth = true,
}: SiteShellProps) {
  const session = await auth();

  if (requireAuth && !session?.user) {
    redirect("/login");
  }

  // server action moved to components/actions/authActions.ts

  return (
    <div className="min-h-screen">
      <TopNavBar
        routes={appRoutes}
        signedIn={Boolean(session?.user)}
        userId={session?.user?.id}
        userName={session?.user?.name}
        onSignOut={session?.user ? handleSignOut : undefined}
      />
      <main className="pt-16">{children}</main>
    </div>
  );
}
