import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const submissionId = searchParams.get("submissionId");
  const type = searchParams.get("type");
  const regenerate = searchParams.get("regenerate") === "true";

  if (!submissionId || !type) {
    return NextResponse.json(
      { error: "submissionId and type are required" },
      { status: 400 },
    );
  }

  try {
    // If regenerate is requested, delete the existing tutoring
    if (regenerate) {
      await prisma.aiTutoring
        .delete({
          where: {
            submissionId_tutoringType: {
              submissionId,
              tutoringType: type,
            },
          },
        })
        .catch(() => {
          // If the record doesn't exist, that's fine
        });

      // Trigger regeneration by calling the tutoring API
      const tutoringRes = await fetch(
        "http://localhost:3000/api/learn/tutoring",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId, tutoringType: type }),
        },
      );

      if (!tutoringRes.ok) {
        throw new Error("Failed to regenerate tutoring");
      }

      return NextResponse.json(await tutoringRes.json());
    }

    // Get the tutoring content
    const tutoring = await prisma.aiTutoring.findUnique({
      where: {
        submissionId_tutoringType: {
          submissionId,
          tutoringType: type,
        },
      },
    });

    if (!tutoring) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      tutoringType: tutoring.tutoringType,
      tutoringContent: tutoring.tutoringContent,
    });
  } catch (error) {
    console.error("Error fetching analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch analysis" },
      { status: 500 },
    );
  }
}
