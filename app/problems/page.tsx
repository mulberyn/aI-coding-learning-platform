import { SiteShell } from "@/components/site-shell";
import { ProblemBrowser } from "@/components/problem-browser";
import { auth } from "@/auth";
import { getProblemCatalog, getUserProblemAttemptMap } from "@/lib/problems";

export default async function ProblemsPage() {
  const catalog = await getProblemCatalog();
  const session = await auth();
  const attemptMap = await getUserProblemAttemptMap(session?.user?.id ?? null);

  return (
    <SiteShell>
      <ProblemBrowser
        problems={catalog}
        userId={session?.user?.id ?? null}
        attemptMap={attemptMap}
      />
    </SiteShell>
  );
}
