import Link from "next/link";

type LearnPageProps = {
  searchParams: Promise<{ problemSlug?: string }>;
};

export default async function LearnPage({ searchParams }: LearnPageProps) {
  const { problemSlug } = await searchParams;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-foreground">学习</h1>
        <p className="mt-3 text-muted">
          该页面已预留为独立界面，后续可放题解、知识点与讲解内容。
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
