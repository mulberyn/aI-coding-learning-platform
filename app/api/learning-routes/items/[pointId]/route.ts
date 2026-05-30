import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateLearningRoutePoint } from "@/lib/learning-route-db";
import { refreshLearningRouteTrackingForRoute } from "@/lib/learning-route-tracking";
import { type LearningRoutePointStatus } from "@/lib/learning-route-types";

function normalizeStatus(value: unknown): LearningRoutePointStatus | undefined {
  if (value === "pending" || value === "in_progress" || value === "done") {
    return value;
  }

  return undefined;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ pointId: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { pointId } = await context.params;
    const body = await request.json();
    const nextStatus = normalizeStatus(body?.status);
    const isManualUpdate = body?.manual === true;

    const detail = await updateLearningRoutePoint({
      userId,
      pointId,
      status: nextStatus,
      manualStatus: isManualUpdate ? (nextStatus ?? null) : undefined,
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      description:
        typeof body?.description === "string"
          ? body.description.trim()
          : undefined,
      targetDate:
        body?.targetDate === null
          ? null
          : typeof body?.targetDate === "string"
            ? body.targetDate.trim()
            : undefined,
    });

    if (!detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const refreshedDetail =
      isManualUpdate || nextStatus === "done"
        ? ((await refreshLearningRouteTrackingForRoute({
            userId,
            routeId: detail.route.id,
          })) ?? detail)
        : detail;

    return NextResponse.json({ detail: refreshedDetail });
  } catch (error) {
    console.error("update learning route point failed:", error);
    return NextResponse.json({ error: "更新学习点失败" }, { status: 500 });
  }
}
