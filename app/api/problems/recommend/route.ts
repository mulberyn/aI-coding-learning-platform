import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { getTopicProblemRecommendation } from "@/lib/problem-knowledge";

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const topic = String(body?.topic ?? "").trim();

    if (!topic) {
      return NextResponse.json({ error: "缺少知识点" }, { status: 400 });
    }

    const recommendation = await getTopicProblemRecommendation({
      userId,
      topic,
    });

    return NextResponse.json({
      topic,
      ...recommendation,
    });
  } catch (error) {
    console.error("Recommend topic problems failed:", error);
    return NextResponse.json(
      { error: "推荐题目失败，请检查模型配置" },
      { status: 500 },
    );
  }
}
