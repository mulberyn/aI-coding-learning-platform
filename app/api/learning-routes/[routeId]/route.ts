import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  deleteLearningRoute,
  getLearningRouteDetailById,
} from "@/lib/learning-route-db";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ routeId: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { routeId } = await context.params;
  const detail = await getLearningRouteDetailById({ userId, routeId });
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ detail });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ routeId: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { routeId } = await context.params;
  const ok = await deleteLearningRoute({ userId, routeId });
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
