import Link from "next/link";
import { auth } from "@/auth";
import { TopNavBar } from "@/app/components/TopNavBar";
import { SubmissionPanel } from "@/components/submission-panel";
import { getProblemBySlug } from "@/lib/problems";

type SubmitPageProps = {
  searchParams: Promise<{
    problemSlug?: string;
    problemType?: "FUNCTIONAL" | "TRADITIONAL";
  }>;
};

function buildDefaultCode(problemType: "FUNCTIONAL" | "TRADITIONAL") {
  if (problemType === "FUNCTIONAL") {
    return `#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  // TODO: 根据题意读取输入并输出
  return 0;
}`;
  }

  return `#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  // TODO: 根据题意读取输入并输出
  return 0;
}`;
}

export default async function SubmitPage({ searchParams }: SubmitPageProps) {
  const session = await auth();
  const { problemSlug, problemType } = await searchParams;

  const problem = problemSlug ? await getProblemBySlug(problemSlug) : null;
  const resolvedType =
    problem?.type ??
    (problemType === "FUNCTIONAL" ? "FUNCTIONAL" : "TRADITIONAL");
  const defaultCode = buildDefaultCode(resolvedType);

  const routes = [
    { href: "/", label: "首页" },
    { href: "/problems", label: "题库" },
    { href: "/submissions", label: "提交记录" },
    { href: "/contests", label: "比赛" },
    { href: "/forum", label: "论坛" },
  ];

  return (
    <>
      <TopNavBar
        routes={routes}
        signedIn={!!session}
        userName={session?.user?.name}
      />
      <main className="min-h-screen bg-background pt-14">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-foreground">
              {problem
                ? `${problem.problemNumber}. ${problem.title} - 提交代码`
                : "提交代码"}
            </h1>
            <Link
              href={problemSlug ? `/problems/${problemSlug}` : "/problems"}
              className="rounded-lg border border-ui px-3 py-2 text-sm text-foreground hover:bg-panel-strong"
            >
              返回题目
            </Link>
          </div>

          <SubmissionPanel
            problemSlug={problemSlug ?? ""}
            problemType={resolvedType}
            defaultCode={defaultCode}
          />
        </div>
      </main>
    </>
  );
}
