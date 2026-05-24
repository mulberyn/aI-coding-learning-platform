import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { SiteShell } from "@/components/site-shell";
import { getLearningRouteDetailById } from "@/lib/learning-route-db";
import { refreshLearningRouteTrackingForRoute } from "@/lib/learning-route-tracking";
import { getLearningRouteProgress } from "@/lib/learning-route-progress";
import { LearningRouteTrackingPanel } from "@/app/components/LearningRouteTrackingPanel";

type TrackingPageProps = {
  params: Promise<{ routeId: string }>;
};

export default async function LearningRouteTrackingPage({
  params,
}: TrackingPageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-md border border-ui bg-panel px-4 py-4 text-sm text-muted">
            请先登录后查看学习路线追踪详情。
          </section>
        </div>
      </SiteShell>
    );
  }

  const { routeId } = await params;
  let detail = await getLearningRouteDetailById({ userId, routeId });
  if (!detail) {
    notFound();
  }

  if (
    detail &&
    !detail.route.tracking &&
    (detail.route.progress?.completedPoints ?? 0) > 0
  ) {
    detail =
      (await refreshLearningRouteTrackingForRoute({ userId, routeId })) ??
      detail;
  }

  const progress = getLearningRouteProgress(detail);

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <LearningRouteTrackingPanel
          routeId={detail.route.id}
          routeName={detail.route.name}
          tracking={detail.route.tracking}
          progress={progress}
          isRefreshing={false}
          mode="detail"
        />
      </div>
    </SiteShell>
  );
}
