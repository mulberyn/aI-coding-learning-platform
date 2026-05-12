import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createLearningRoute,
  getLearningRouteDetailById,
  getLearningRoutesByUser,
} from "@/lib/learning-route-db";
import { type GeneratedLearningRoute } from "@/lib/learning-route-types";

function sanitizeGeneratedRoute(input: GeneratedLearningRoute) {
  const routeName = input.routeName.trim().slice(0, 80) || "AI 学习路线";
  const summary = input.summary.trim().slice(0, 300);

  const points = input.points
    .slice(0, 16)
    .map((point) => ({
      title: point.title.trim().slice(0, 120),
      description: point.description.trim().slice(0, 280),
      pointType: point.pointType,
      refId: point.refId?.trim() || null,
      targetDate: point.targetDate?.trim() || null,
      status: point.status ?? "pending",
    }))
    .filter((point) => point.title.length > 0);

  return {
    routeName,
    summary,
    points,
  } satisfies GeneratedLearningRoute;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const routeId = searchParams.get("routeId");

  const routes = await getLearningRoutesByUser(userId);
  if (!routeId) {
    return NextResponse.json({ routes, detail: null });
  }

  const detail = await getLearningRouteDetailById({ userId, routeId });
  return NextResponse.json({ routes, detail });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const source = body?.source === "manual" ? "manual" : "ai";
    const generated = sanitizeGeneratedRoute(body?.generated as GeneratedLearningRoute);

    if (!generated.routeName || generated.points.length === 0) {
      return NextResponse.json(
        { error: "学习路线名称和至少一个学习点是必填项" },
        { status: 400 },
      );
    }

    const detail = await createLearningRoute({
      userId,
      source,
      inputPrompt:
        typeof body?.inputPrompt === "string" ? body.inputPrompt : null,
      generated,
    });

    return NextResponse.json({ detail }, { status: 201 });
  } catch (error) {
    console.error("create learning route failed:", error);
    return NextResponse.json(
      { error: "保存学习路线失败" },
      { status: 500 },
    );
  }
}
