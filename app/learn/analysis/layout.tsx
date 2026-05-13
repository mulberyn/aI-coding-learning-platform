import { auth } from "@/auth";
import { TopNavBar } from "@/app/components/TopNavBar";

export default async function AnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <>
      <TopNavBar
        signedIn={!!session}
        userId={session?.user?.id}
        userName={session?.user?.name}
      />
      {children}
    </>
  );
}
