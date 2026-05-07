import { ContestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const contest = await prisma.contest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      participantCount: true,
      registrations: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
  });

  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  if (contest.status !== ContestStatus.NOT_STARTED) {
    return NextResponse.json(
      { error: "Only not started contests can be registered" },
      { status: 400 },
    );
  }

  if (contest.registrations.length > 0) {
    return NextResponse.json({ error: "Already registered" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.contestRegistration.create({
      data: {
        contestId: contest.id,
        userId: session.user.id,
      },
    }),
    prisma.contest.update({
      where: { id: contest.id },
      data: {
        participantCount: {
          increment: 1,
        },
      },
    }),
  ]);

  return NextResponse.json({ registered: true }, { status: 201 });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const contest = await prisma.contest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      registrations: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
  });

  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  if (contest.status !== ContestStatus.NOT_STARTED) {
    return NextResponse.json(
      { error: "Only not started contests can be canceled" },
      { status: 400 },
    );
  }

  if (contest.registrations.length === 0) {
    return NextResponse.json({ error: "Not registered" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.contestRegistration.delete({
      where: {
        contestId_userId: {
          contestId: contest.id,
          userId: session.user.id,
        },
      },
    }),
    prisma.contest.update({
      where: { id: contest.id },
      data: {
        participantCount: {
          decrement: 1,
        },
      },
    }),
  ]);

  return NextResponse.json({ registered: false }, { status: 200 });
}
