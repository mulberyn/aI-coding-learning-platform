import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const session = await auth();
  const { id } = await params;

  if (session?.user?.id !== id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { provider, name, model, apiKey } = body;

    if (!provider || !name || !model || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create new API key config
    const config = await prisma.apiKeyConfig.create({
      data: {
        userId: id,
        provider,
        name,
        model,
        apiKey,
        isActive: false,
      },
    });

    return NextResponse.json({
      id: config.id,
      provider: config.provider,
      name: config.name,
      model: config.model,
      apiKey: config.apiKey,
      isActive: config.isActive,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "该运营商的同名配置已存在" },
        { status: 409 },
      );
    }
    console.error("Error creating LLM config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const session = await auth();
  const { id } = await params;

  if (session?.user?.id !== id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const configs = await prisma.apiKeyConfig.findMany({
      where: { userId: id },
      select: {
        id: true,
        provider: true,
        name: true,
        model: true,
        apiKey: true,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(configs);
  } catch (error) {
    console.error("Error fetching LLM configs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
