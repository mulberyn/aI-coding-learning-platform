import { appRoutes } from "@/lib/route";
import { auth, signOut } from "@/auth";
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

  async function handleSignOut(_formData: FormData) {
    "use server";
    await signOut({ redirectTo: "/" });
  }

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
