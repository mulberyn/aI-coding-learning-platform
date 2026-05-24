import { auth } from "@/auth";
import { SiteShell } from "@/components/site-shell";
import { ProblemBrowser } from "@/components/problem-browser";
import { getProblemCatalog, getUserProblemAttemptMap } from "@/lib/problems";

type TopicPageProps = {
  params: Promise<{ topic: string }>;
};

function decodeTopicParam(topic: string) {
  try {
    return decodeURIComponent(topic);
  } catch {
    return topic;
  }
}

export default async function TopicProblemsPage({ params }: TopicPageProps) {
  const session = await auth();
  const { topic } = await params;
  const decodedTopic = decodeTopicParam(topic);
  const catalog = await getProblemCatalog();
  const attemptMap = await getUserProblemAttemptMap(session?.user?.id ?? null);

  return (
    <SiteShell>
      <ProblemBrowser
        problems={catalog}
        userId={session?.user?.id ?? null}
        attemptMap={attemptMap}
        initialTopicFilter={decodedTopic}
        showKnowledgeModule={false}
      />
    </SiteShell>
  );
}
