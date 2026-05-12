import { SiteShell } from "@/components/site-shell";
import { auth } from "@/auth";
import {
  getLearningRouteDetailById,
  getLearningRoutesByUser,
} from "@/lib/learning-route-db";
import { LearningRouteWorkspace } from "@/app/components/LearningRouteWorkspace";

export default async function LearningRoutePage() {
  const session = await auth();
  const userId = session?.user?.id;

  const routes = userId ? await getLearningRoutesByUser(userId) : [];
  const firstRoute = routes[0] ?? null;

  const detail = userId && firstRoute
    ? await getLearningRouteDetailById({ userId, routeId: firstRoute.id })
    : null;

  return (
    <SiteShell>
      <LearningRouteWorkspace initialRoutes={routes} initialDetail={detail} />
    </SiteShell>
  );
}
