import Link from "next/link";

type DiscussionPageProps = {
  searchParams: Promise<{ problemSlug?: string }>;
};

export default async function DiscussionPage({
  searchParams,
}: DiscussionPageProps) {
  const { problemSlug } = await searchParams;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-foreground">讨论</h1>
        <p className="mt-3 text-muted">
          该页面已预留为独立界面，后续可接入评论区与问答模块。
        </p>
        <div className="mt-6">
          <Link
            href={problemSlug ? `/problems/${problemSlug}` : "/problems"}
            className="rounded-lg border border-ui px-3 py-2 text-sm text-foreground hover:bg-panel-strong"
          >
            返回题目
          </Link>
        </div>
      </div>
    </main>
  );
}
