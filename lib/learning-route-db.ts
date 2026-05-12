import { prisma } from "@/lib/prisma";
import {
  type GeneratedLearningRoute,
  type LearningRoute,
  type LearningRoutePoint,
  type LearningRoutePointStatus,
  type LearningRouteWithPoints,
} from "@/lib/learning-route-types";

const TABLES_READY_KEY = "__learning_route_tables_ready__";

function newId() {
  return `lr_${crypto.randomUUID().replaceAll("-", "")}`;
}

function normalizeDateText(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return new Date().toISOString();
}

async function ensureLearningRouteTables() {
  const scopedGlobal = globalThis as Record<string, unknown>;
  if (scopedGlobal[TABLES_READY_KEY]) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS learning_routes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      input_prompt TEXT,
      summary TEXT,
      generated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS learning_route_points (
      id TEXT PRIMARY KEY,
      route_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      point_type TEXT NOT NULL DEFAULT 'custom',
      ref_id TEXT,
      target_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(route_id) REFERENCES learning_routes(id) ON DELETE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_learning_routes_user_created ON learning_routes(user_id, created_at DESC);",
  );

  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_learning_route_points_route_sort ON learning_route_points(route_id, sort_order ASC);",
  );

  scopedGlobal[TABLES_READY_KEY] = true;
}

type RouteRow = {
  id: string;
  user_id: string;
  name: string;
  source: "manual" | "ai";
  input_prompt: string | null;
  summary: string | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
};

type PointRow = {
  id: string;
  route_id: string;
  title: string;
  description: string;
  point_type: "problem" | "contest" | "forum" | "custom";
  ref_id: string | null;
  target_date: string | null;
  status: LearningRoutePointStatus;
  sort_order: number;
};

function mapRouteRow(row: RouteRow): LearningRoute {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    source: row.source,
    inputPrompt: row.input_prompt,
    summary: row.summary,
    generatedAt: normalizeDateText(row.generated_at),
    createdAt: normalizeDateText(row.created_at),
    updatedAt: normalizeDateText(row.updated_at),
  };
}

function mapPointRow(row: PointRow): LearningRoutePoint {
  return {
    id: row.id,
    routeId: row.route_id,
    title: row.title,
    description: row.description,
    pointType: row.point_type,
    refId: row.ref_id,
    targetDate: row.target_date,
    status: row.status,
    sortOrder: row.sort_order,
  };
}

export async function getLearningRoutesByUser(userId: string) {
  await ensureLearningRouteTables();

  const rows = await prisma.$queryRawUnsafe<RouteRow[]>(
    `
      SELECT id, user_id, name, source, input_prompt, summary, generated_at, created_at, updated_at
      FROM learning_routes
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC
      LIMIT 80;
    `,
    userId,
  );

  return rows.map(mapRouteRow);
}

export async function getLearningRouteDetailById(params: {
  userId: string;
  routeId: string;
}) {
  const { userId, routeId } = params;
  await ensureLearningRouteTables();

  const routeRows = await prisma.$queryRawUnsafe<RouteRow[]>(
    `
      SELECT id, user_id, name, source, input_prompt, summary, generated_at, created_at, updated_at
      FROM learning_routes
      WHERE id = ? AND user_id = ?
      LIMIT 1;
    `,
    routeId,
    userId,
  );

  const route = routeRows[0];
  if (!route) {
    return null;
  }

  const pointRows = await prisma.$queryRawUnsafe<PointRow[]>(
    `
      SELECT id, route_id, title, description, point_type, ref_id, target_date, status, sort_order
      FROM learning_route_points
      WHERE route_id = ?
      ORDER BY sort_order ASC;
    `,
    routeId,
  );

  return {
    route: mapRouteRow(route),
    points: pointRows.map(mapPointRow),
  } satisfies LearningRouteWithPoints;
}

export async function createLearningRoute(params: {
  userId: string;
  source: "manual" | "ai";
  inputPrompt?: string | null;
  generated: GeneratedLearningRoute;
}) {
  const { userId, source, inputPrompt, generated } = params;
  await ensureLearningRouteTables();

  const routeId = newId();
  const nowText = new Date().toISOString();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO learning_routes (id, user_id, name, source, input_prompt, summary, generated_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    routeId,
    userId,
    generated.routeName,
    source,
    inputPrompt ?? null,
    generated.summary,
    nowText,
    nowText,
    nowText,
  );

  for (let index = 0; index < generated.points.length; index += 1) {
    const point = generated.points[index];
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO learning_route_points (id, route_id, title, description, point_type, ref_id, target_date, status, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      newId(),
      routeId,
      point.title,
      point.description,
      point.pointType,
      point.refId ?? null,
      point.targetDate ?? null,
      point.status ?? "pending",
      index,
    );
  }

  return getLearningRouteDetailById({ userId, routeId });
}

export async function updateLearningRoutePoint(params: {
  userId: string;
  pointId: string;
  status?: LearningRoutePointStatus;
  title?: string;
  description?: string;
  targetDate?: string | null;
}) {
  const { userId, pointId, status, title, description, targetDate } = params;
  await ensureLearningRouteTables();

  const rows = await prisma.$queryRawUnsafe<Array<{ route_id: string }>>(
    `
      SELECT p.route_id AS route_id
      FROM learning_route_points p
      JOIN learning_routes r ON r.id = p.route_id
      WHERE p.id = ? AND r.user_id = ?
      LIMIT 1;
    `,
    pointId,
    userId,
  );

  const routeId = rows[0]?.route_id;
  if (!routeId) {
    return null;
  }

  if (status !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE learning_route_points SET status = ? WHERE id = ?;`,
      status,
      pointId,
    );
  }

  if (title !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE learning_route_points SET title = ? WHERE id = ?;`,
      title,
      pointId,
    );
  }

  if (description !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE learning_route_points SET description = ? WHERE id = ?;`,
      description,
      pointId,
    );
  }

  if (targetDate !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE learning_route_points SET target_date = ? WHERE id = ?;`,
      targetDate,
      pointId,
    );
  }

  await prisma.$executeRawUnsafe(
    `UPDATE learning_routes SET updated_at = ? WHERE id = ?;`,
    new Date().toISOString(),
    routeId,
  );

  return getLearningRouteDetailById({ userId, routeId });
}

export async function deleteLearningRoute(params: {
  userId: string;
  routeId: string;
}) {
  const { userId, routeId } = params;
  await ensureLearningRouteTables();

  const deleted = await prisma.$executeRawUnsafe(
    `DELETE FROM learning_routes WHERE id = ? AND user_id = ?;`,
    routeId,
    userId,
  );

  return deleted > 0;
}
