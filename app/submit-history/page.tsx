import { redirect } from "next/navigation";

type SubmitHistoryPageProps = {
  searchParams: Promise<{ problemSlug?: string }>;
};

export default async function SubmitHistoryPage({
  searchParams,
}: SubmitHistoryPageProps) {
  const { problemSlug } = await searchParams;

  if (problemSlug) {
    redirect(
      `/submissions?problem=${encodeURIComponent(problemSlug)}&problemSlug=${encodeURIComponent(problemSlug)}`,
    );
  }

  redirect("/submissions");
}
