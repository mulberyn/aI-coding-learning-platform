import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; configId: string }>;
  },
) {
  const session = await auth();
  const { id, configId } = await params;

  if (session?.user?.id !== id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { isActive } = body;

    // Verify the config belongs to the user
    const existingConfig = await prisma.apiKeyConfig.findUnique({
      where: { id: configId },
    });

    if (!existingConfig || existingConfig.userId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // If setting this config as active, deactivate all others
    if (isActive) {
      await prisma.apiKeyConfig.updateMany({
        where: {
          userId: id,
        },
        data: { isActive: false },
      });
    }

    const updatedConfig = await prisma.apiKeyConfig.update({
      where: { id: configId },
      data: { isActive },
      select: {
        id: true,
        provider: true,
        name: true,
        model: true,
        apiKey: true,
        isActive: true,
      },
    });

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error("Error updating LLM config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; configId: string }>;
  },
) {
  const session = await auth();
  const { id, configId } = await params;

  if (session?.user?.id !== id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Verify the config belongs to the user
    const existingConfig = await prisma.apiKeyConfig.findUnique({
      where: { id: configId },
    });

    if (!existingConfig || existingConfig.userId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.apiKeyConfig.delete({
      where: { id: configId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting LLM config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
