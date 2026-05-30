import { prisma } from "@/lib/prisma";
import { getUserProblemAttemptMap } from "@/lib/problems";
import {
  type GeneratedLearningRoute,
  type LearningRoute,
  type LearningRoutePoint,
  type LearningRoutePointStatus,
  type LearningRouteTracking,
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
      manual_status TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(route_id) REFERENCES learning_routes(id) ON DELETE CASCADE
    );
  `);

  const pointColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info(learning_route_points);`,
  );

  if (!pointColumns.some((column) => column.name === "manual_status")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE learning_route_points ADD COLUMN manual_status TEXT;`,
    );
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS learning_route_tracking (
      route_id TEXT PRIMARY KEY,
      summary TEXT NOT NULL DEFAULT '',
      quality_score INTEGER NOT NULL DEFAULT 0,
      study_summary TEXT NOT NULL DEFAULT '',
      next_route_prompt TEXT NOT NULL DEFAULT '',
      analysis TEXT NOT NULL DEFAULT '[]',
      suggestions TEXT NOT NULL DEFAULT '[]',
      snippets TEXT NOT NULL DEFAULT '[]',
      completion_signature TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      FOREIGN KEY(route_id) REFERENCES learning_routes(id) ON DELETE CASCADE
    );
  `);

  const trackingColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info(learning_route_tracking);`,
  );

  for (const [columnName, columnDefinition] of [
    ["quality_score", "INTEGER NOT NULL DEFAULT 0"],
    ["study_summary", "TEXT NOT NULL DEFAULT ''"],
    ["next_route_prompt", "TEXT NOT NULL DEFAULT ''"],
  ] as const) {
    if (!trackingColumns.some((column) => column.name === columnName)) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE learning_route_tracking ADD COLUMN ${columnName} ${columnDefinition};`,
      );
    }
  }

  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_learning_routes_user_created ON learning_routes(user_id, created_at DESC);",
  );

  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_learning_route_points_route_sort ON learning_route_points(route_id, sort_order ASC);",
  );

  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_learning_route_tracking_updated ON learning_route_tracking(updated_at DESC);",
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
  manual_status: LearningRoutePointStatus | null;
  sort_order: number;
};

type TrackingRow = {
  route_id: string;
  summary: string;
  quality_score: number;
  study_summary: string;
  next_route_prompt: string;
  analysis: string;
  suggestions: string;
  snippets: string;
  completion_signature: string;
  updated_at: string;
};

type ContestProgressRow = {
  contestId: string;
  totalScore: number;
  rank: number;
};

type ProblemRefRow = {
  id: string;
  slug: string;
};

function buildPointHref(pointType: PointRow["point_type"], refId: string) {
  if (pointType === "problem") {
    return `/problems/${refId}`;
  }

  if (pointType === "contest") {
    return `/contests/${refId}`;
  }

  if (pointType === "forum") {
    return `/forum/${refId}`;
  }

  return null;
}

function buildPointLinkLabel(pointType: PointRow["point_type"]) {
  if (pointType === "problem") return "查看原题";
  if (pointType === "contest") return "查看比赛";
  if (pointType === "forum") return "查看帖子";
  return "查看详情";
}

function computeRouteProgress(points: LearningRoutePoint[]) {
  const totalPoints = points.length;
  const completedPoints = points.filter((point) => {
    if (point.manualStatus === "done") {
      return true;
    }

    if (
      point.manualStatus === "pending" ||
      point.manualStatus === "in_progress"
    ) {
      return false;
    }

    if (point.pointType === "problem") {
      return point.problemAttemptState === "SOLVED";
    }

    if (point.pointType === "contest") {
      return Boolean(point.contestRegistered && point.contestScore !== null);
    }

    return point.status === "done";
  }).length;

  return {
    totalPoints,
    completedPoints,
    completionRate: totalPoints > 0 ? completedPoints / totalPoints : 0,
    isComplete: totalPoints > 0 && completedPoints === totalPoints,
  };
}

async function getContestProgressMap(userId: string, contestIds: string[]) {
  if (contestIds.length === 0) {
    return {
      registrationSet: new Set<string>(),
      rankingMap: new Map<string, ContestProgressRow>(),
    };
  }

  const [registrations, rankings] = await Promise.all([
    prisma.contestRegistration.findMany({
      where: { userId, contestId: { in: contestIds } },
      select: { contestId: true },
    }),
    prisma.contestRanking.findMany({
      where: { userId, contestId: { in: contestIds } },
      select: { contestId: true, totalScore: true, rank: true },
    }),
  ]);

  return {
    registrationSet: new Set(registrations.map((item) => item.contestId)),
    rankingMap: new Map(
      rankings.map((item) => [item.contestId, item as ContestProgressRow]),
    ),
  };
}

async function getProblemAttemptStateByRefs(userId: string, refIds: string[]) {
  if (refIds.length === 0) {
    return new Map<string, "UNTRIED" | "ATTEMPTED" | "SOLVED">();
  }

  const uniqueRefs = Array.from(new Set(refIds.filter(Boolean)));
  const problems = await prisma.problem.findMany({
    where: {
      OR: [{ slug: { in: uniqueRefs } }, { id: { in: uniqueRefs } }],
    },
    select: {
      id: true,
      slug: true,
    },
  });

  const attemptMap = await getUserProblemAttemptMap(userId);
  const stateByRef = new Map<string, "UNTRIED" | "ATTEMPTED" | "SOLVED">();

  for (const problem of problems) {
    const state = attemptMap[problem.id] ?? "UNTRIED";
    stateByRef.set(problem.id, state);
    stateByRef.set(problem.slug, state);
  }

  return stateByRef;
}

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

function parseTrackingRow(row: TrackingRow): LearningRouteTracking {
  const parseTextArray = (value: string) => {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        return [] as string[];
      }

      return parsed.filter((item): item is string => typeof item === "string");
    } catch {
      return [] as string[];
    }
  };

  const parseSuggestionArray = (value: string) => {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        return [] as LearningRouteTracking["suggestions"];
      }

      return parsed
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const suggestion = item as { title?: unknown; reason?: unknown };
          if (
            typeof suggestion.title !== "string" ||
            typeof suggestion.reason !== "string"
          ) {
            return null;
          }

          return {
            title: suggestion.title,
            reason: suggestion.reason,
          };
        })
        .filter(
          (item): item is LearningRouteTracking["suggestions"][number] =>
            item !== null,
        );
    } catch {
      return [] as LearningRouteTracking["suggestions"];
    }
  };

  const parseSnippetArray = (value: string) => {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        return [] as LearningRouteTracking["snippets"];
      }

      return parsed
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const snippet = item as {
            problemTitle?: unknown;
            status?: unknown;
            createdAt?: unknown;
            code?: unknown;
          };

          if (
            typeof snippet.problemTitle !== "string" ||
            typeof snippet.status !== "string" ||
            typeof snippet.createdAt !== "string" ||
            typeof snippet.code !== "string"
          ) {
            return null;
          }

          return {
            problemTitle: snippet.problemTitle,
            status: snippet.status,
            createdAt: snippet.createdAt,
            code: snippet.code,
          };
        })
        .filter(
          (item): item is LearningRouteTracking["snippets"][number] =>
            item !== null,
        );
    } catch {
      return [] as LearningRouteTracking["snippets"];
    }
  };

  return {
    summary: row.summary,
    qualityScore: row.quality_score,
    studySummary: row.study_summary,
    nextRoutePrompt: row.next_route_prompt,
    analysis: parseTextArray(row.analysis),
    suggestions: parseSuggestionArray(row.suggestions),
    snippets: parseSnippetArray(row.snippets),
    completionSignature: row.completion_signature,
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
    manualStatus: row.manual_status,
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
      SELECT id, route_id, title, description, point_type, ref_id, target_date, status, manual_status, sort_order
      FROM learning_route_points
      WHERE route_id = ?
      ORDER BY sort_order ASC;
    `,
    routeId,
  );

  const trackingRows = await prisma.$queryRawUnsafe<TrackingRow[]>(
    `
      SELECT route_id, summary, analysis, suggestions, snippets, completion_signature, updated_at
      FROM learning_route_tracking
      WHERE route_id = ?
      LIMIT 1;
    `,
    routeId,
  );

  const problemRefIds = pointRows
    .filter((point) => point.point_type === "problem" && point.ref_id)
    .map((point) => point.ref_id as string);
  const contestProgressMap = await getContestProgressMap(
    userId,
    pointRows
      .filter((point) => point.point_type === "contest" && point.ref_id)
      .map((point) => point.ref_id as string),
  );
  const problemAttemptMap = await getProblemAttemptStateByRefs(
    userId,
    problemRefIds,
  );

  const points = pointRows.map((row) => {
    const point = mapPointRow(row);
    const refId = row.ref_id?.trim() || null;

    return {
      ...point,
      linkHref: refId ? buildPointHref(row.point_type, refId) : null,
      linkLabel: buildPointLinkLabel(row.point_type),
      problemAttemptState:
        row.point_type === "problem" && refId
          ? (problemAttemptMap.get(refId) ?? "UNTRIED")
          : undefined,
      contestRegistered:
        row.point_type === "contest" && refId
          ? contestProgressMap.registrationSet.has(refId)
          : undefined,
      contestScore:
        row.point_type === "contest" && refId
          ? (contestProgressMap.rankingMap.get(refId)?.totalScore ?? null)
          : undefined,
      contestRank:
        row.point_type === "contest" && refId
          ? (contestProgressMap.rankingMap.get(refId)?.rank ?? null)
          : undefined,
    } satisfies LearningRoutePoint;
  });

  return {
    route: {
      ...mapRouteRow(route),
      progress: computeRouteProgress(points),
      tracking: trackingRows[0] ? parseTrackingRow(trackingRows[0]) : null,
    },
    points,
  } satisfies LearningRouteWithPoints;
}

export async function upsertLearningRouteTracking(params: {
  routeId: string;
  summary: string;
  qualityScore: number;
  studySummary: string;
  nextRoutePrompt: string;
  analysis: string[];
  suggestions: Array<{
    title: string;
    reason: string;
  }>;
  snippets: Array<{
    problemTitle: string;
    status: string;
    createdAt: string;
    code: string;
  }>;
  completionSignature: string;
}) {
  const {
    routeId,
    summary,
    qualityScore,
    studySummary,
    nextRoutePrompt,
    analysis,
    suggestions,
    snippets,
    completionSignature,
  } = params;
  await ensureLearningRouteTables();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO learning_route_tracking (
        route_id,
        summary,
        quality_score,
        study_summary,
        next_route_prompt,
        analysis,
        suggestions,
        snippets,
        completion_signature,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(route_id) DO UPDATE SET
        summary = excluded.summary,
        quality_score = excluded.quality_score,
        study_summary = excluded.study_summary,
        next_route_prompt = excluded.next_route_prompt,
        analysis = excluded.analysis,
        suggestions = excluded.suggestions,
        snippets = excluded.snippets,
        completion_signature = excluded.completion_signature,
        updated_at = excluded.updated_at;
    `,
    routeId,
    summary,
    qualityScore,
    studySummary,
    nextRoutePrompt,
    JSON.stringify(analysis),
    JSON.stringify(suggestions),
    JSON.stringify(snippets),
    completionSignature,
    new Date().toISOString(),
  );
}

export async function getLearningRouteTrackingByRouteId(params: {
  routeId: string;
}) {
  const { routeId } = params;
  await ensureLearningRouteTables();

  const rows = await prisma.$queryRawUnsafe<TrackingRow[]>(
    `
      SELECT route_id, summary, analysis, suggestions, snippets, completion_signature, updated_at
      FROM learning_route_tracking
      WHERE route_id = ?
      LIMIT 1;
    `,
    routeId,
  );

  return rows[0] ? parseTrackingRow(rows[0]) : null;
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
  manualStatus?: LearningRoutePointStatus | null;
}) {
  const {
    userId,
    pointId,
    status,
    title,
    description,
    targetDate,
    manualStatus,
  } = params;
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

  if (status !== undefined && manualStatus === undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE learning_route_points SET status = ? WHERE id = ?;`,
      status,
      pointId,
    );
  }

  if (manualStatus !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE learning_route_points SET manual_status = ? WHERE id = ?;`,
      manualStatus,
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
