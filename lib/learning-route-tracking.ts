import { prisma } from "@/lib/prisma";
import {
  getLearningRouteDetailById,
  upsertLearningRouteTracking,
} from "@/lib/learning-route-db";
import { type LearningRouteTracking } from "@/lib/learning-route-types";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const QWEN_API_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type LlmConfig = {
  provider: string;
  model: string;
  apiKey: string;
};

type TrackingEvidence = {
  routeSummary: string;
  progressSummary: string;
  pointSummaryLines: string[];
  snippets: LearningRouteTracking["snippets"];
  latestCompletionText: string;
  completionSignature: string;
};

type RouteProblemRefRow = {
  id: string;
  slug: string;
  title: string;
};

type SubmissionRow = {
  id: string;
  status: string;
  sourceCode: string;
  createdAt: Date;
  problemId: string;
  problemTitle: string;
  problemSlug: string;
};

type TrackingJson = {
  summary?: unknown;
  qualityScore?: unknown;
  studySummary?: unknown;
  analysis?: unknown;
  suggestions?: unknown;
  nextRoutePrompt?: unknown;
};

function getProviderEndpoint(provider: string) {
  return provider === "qwen" ? QWEN_API_URL : DEEPSEEK_API_URL;
}

async function callProviderChat(params: {
  provider: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
}) {
  const { provider, apiKey, model, messages } = params;
  const response = await fetch(getProviderEndpoint(provider), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.35,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`${provider} chat request failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error(`${provider} response did not contain content`);
  }

  return content;
}

async function getLlmConfig(userId: string): Promise<LlmConfig | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      aiProvider: true,
      aiModel: true,
      aiApiKey: true,
      apiKeyConfigs: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          provider: true,
          model: true,
          apiKey: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const selectedConfig = user.apiKeyConfigs[0];
  const apiKey = selectedConfig?.apiKey ?? user.aiApiKey;
  if (!apiKey) {
    return null;
  }

  return {
    provider: (
      selectedConfig?.provider ??
      user.aiProvider ??
      "deepseek"
    ).toLowerCase(),
    model: selectedConfig?.model ?? user.aiModel ?? "deepseek-chat",
    apiKey,
  };
}

function parseTrackingJson(content: string): TrackingJson | null {
  const trimmed = content.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const jsonText =
    start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;

  try {
    return JSON.parse(jsonText) as TrackingJson;
  } catch {
    return null;
  }
}

function clampText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function buildRouteProgressSummary(
  detail: Awaited<ReturnType<typeof getLearningRouteDetailById>>,
) {
  if (!detail) {
    return "";
  }

  const progress = detail.route.progress;
  if (!progress) {
    return "";
  }

  return `完成 ${progress.completedPoints}/${progress.totalPoints} 个学习点，完成率 ${(progress.completionRate * 100).toFixed(1)}%。`;
}

function buildCompletionSignature(
  evidence: TrackingEvidence,
  detail: Awaited<ReturnType<typeof getLearningRouteDetailById>>,
) {
  const pointSignature = detail
    ? detail.points
        .map((point) => {
          const refId = point.refId ?? "none";
          const state =
            point.manualStatus ??
            (point.pointType === "problem"
              ? (point.problemAttemptState ?? point.status)
              : point.pointType === "contest"
                ? `${point.contestRegistered ? "registered" : "unregistered"}-${point.contestScore ?? "none"}`
                : point.status);
          return `${point.id}:${refId}:${state}`;
        })
        .join("|")
    : "";

  const snippetSignature = evidence.snippets
    .map((item) => `${item.problemTitle}:${item.status}:${item.createdAt}`)
    .join("|");

  return [pointSignature, snippetSignature, evidence.latestCompletionText].join(
    "::",
  );
}

async function resolveRouteProblemRefs(routeId: string) {
  const pointRows = await prisma.$queryRawUnsafe<Array<{ ref_id: string }>>(
    `
      SELECT ref_id
      FROM learning_route_points
      WHERE route_id = ? AND point_type = 'problem' AND ref_id IS NOT NULL;
    `,
    routeId,
  );

  const uniqueRefs = Array.from(
    new Set(pointRows.map((row) => row.ref_id).filter(Boolean)),
  );
  if (uniqueRefs.length === 0) {
    return [] as RouteProblemRefRow[];
  }

  const problems = await prisma.problem.findMany({
    where: {
      OR: [{ id: { in: uniqueRefs } }, { slug: { in: uniqueRefs } }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  return problems;
}

async function getRouteSubmissions(userId: string, problemIds: string[]) {
  if (problemIds.length === 0) {
    return [] as SubmissionRow[];
  }

  const submissions = await prisma.submission.findMany({
    where: {
      userId,
      problemId: { in: problemIds },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      status: true,
      sourceCode: true,
      createdAt: true,
      problemId: true,
      problem: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
  });

  return submissions.map((submission) => ({
    id: submission.id,
    status: submission.status,
    sourceCode: submission.sourceCode,
    createdAt: submission.createdAt,
    problemId: submission.problemId,
    problemTitle: submission.problem.title,
    problemSlug: submission.problem.slug,
  }));
}

async function buildTrackingEvidence(params: {
  userId: string;
  routeId: string;
}) {
  const { userId, routeId } = params;
  const detail = await getLearningRouteDetailById({ userId, routeId });
  if (!detail) {
    return null;
  }

  const problemRefs = await resolveRouteProblemRefs(routeId);
  const problemIds = Array.from(new Set(problemRefs.map((item) => item.id)));
  const submissions = await getRouteSubmissions(userId, problemIds);
  const latestSubmission = submissions[0] ?? null;
  const progressSummary = buildRouteProgressSummary(detail);

  const pointSummaryLines = detail.points.map((point) => {
    const refText = point.refId ? `（${point.refId}）` : "";
    const stateText =
      point.manualStatus === "done"
        ? "手动状态 已完成"
        : point.manualStatus === "in_progress"
          ? "手动状态 进行中"
          : point.manualStatus === "pending"
            ? "手动状态 未开始"
            : point.pointType === "problem"
              ? `题目状态 ${point.problemAttemptState ?? "UNTRIED"}`
              : point.pointType === "contest"
                ? `比赛状态 ${point.contestRegistered ? "已参与" : "未参与"}${point.contestScore !== null ? `，得分 ${point.contestScore}` : ""}`
                : `路线状态 ${point.status}`;

    return `${point.title}${refText}｜${stateText}`;
  });

  const snippets = submissions.map((submission) => ({
    problemTitle: submission.problemTitle,
    status: submission.status,
    createdAt: submission.createdAt.toISOString(),
    code: clampText(submission.sourceCode, 360),
  }));

  const latestCompletionText = latestSubmission
    ? `最近一条题目提交是 ${latestSubmission.problemTitle}（${latestSubmission.problemSlug}），状态 ${latestSubmission.status}，提交于 ${latestSubmission.createdAt.toISOString()}。`
    : "当前没有可供抽查的题目提交记录。";

  const evidence: TrackingEvidence = {
    routeSummary: detail.route.summary ?? "",
    progressSummary,
    pointSummaryLines,
    snippets,
    latestCompletionText,
    completionSignature: "",
  };

  evidence.completionSignature = buildCompletionSignature(evidence, detail);
  return { detail, evidence, problemRefs };
}

function buildPromptContent(params: {
  routeName: string;
  evidence: TrackingEvidence;
}) {
  const { routeName, evidence } = params;
  return [
    `学习路线名称：${routeName}`,
    `路线摘要：${evidence.routeSummary || "无"}`,
    `进度摘要：${evidence.progressSummary || "无"}`,
    `学习点状态：`,
    ...evidence.pointSummaryLines.map((line) => `- ${line}`),
    `最近完成信息：${evidence.latestCompletionText}`,
    `抽查提交代码片段：`,
    ...evidence.snippets.map(
      (snippet, index) =>
        `- 样本 ${index + 1}｜${snippet.problemTitle}｜${snippet.status}｜${snippet.createdAt}\n${snippet.code}`,
    ),
    "请仅输出严格 JSON，不要输出 Markdown、解释或代码块。JSON 结构如下：",
    '"summary":"一句话总结当前学习状态","qualityScore":90,"studySummary":"一段学习总结","analysis":["要点1","要点2","要点3"],"suggestions":[{"title":"建议标题","reason":"建议原因"}],"nextRoutePrompt":"可编辑的下一条学习路径提示词"',
    "要求：",
    "1. 必须结合学习路线进度、题目完成情况、最近提交代码片段和完成时间来判断。",
    "2. 不要编造不存在的完成记录，只能基于给定信息输出。",
    "3. 建议必须具体可执行，优先对应当前未完成的学习点。",
    "4. 如果路线已经完成，请给出学习质量评分（0-100）、学习总结和下一条学习路径提示词。",
  ].join("\n");
}

function buildFallbackTracking(params: {
  routeName: string;
  evidence: TrackingEvidence;
}) {
  const { routeName, evidence } = params;
  const nextSuggestions = evidence.pointSummaryLines
    .filter(
      (line) =>
        !line.includes("题目状态 SOLVED") && !line.includes("路线状态 done"),
    )
    .slice(0, 3)
    .map((line) => ({
      title: "继续推进未完成学习点",
      reason: line,
    }));

  return {
    summary: `${routeName} 当前已完成 ${evidence.progressSummary || "部分学习点"}。`,
    qualityScore: 78,
    studySummary:
      "已完成路线的关键学习点，当前更适合进入下一轮围绕薄弱点的强化练习。",
    analysis: [
      evidence.progressSummary || "路线进度正在积累中。",
      evidence.latestCompletionText,
      evidence.snippets.length > 0
        ? "已抽查最近提交代码，建议继续对照代码与题解做复盘。"
        : "当前还没有足够的提交样本，优先补齐题目练习。",
    ],
    suggestions:
      nextSuggestions.length > 0
        ? nextSuggestions
        : [
            {
              title: "回看当前路线的未完成学习点",
              reason: "把注意力集中在最近的未完成题目、比赛或讨论任务上。",
            },
          ],
    nextRoutePrompt:
      "请根据当前路线的学习结果，为我生成一条更偏向薄弱模块强化的新学习路线，包含题目、比赛和总结复盘节点。",
  };
}

export async function regenerateLearningRouteTracking(params: {
  userId: string;
  routeId: string;
}) {
  const { userId, routeId } = params;
  const bundle = await buildTrackingEvidence({ userId, routeId });
  if (!bundle) {
    return null;
  }

  const { detail, evidence, problemRefs } = bundle;
  const config = await getLlmConfig(userId);
  const routeName = detail.route.name;

  let trackingPayload: {
    summary: string;
    qualityScore: number;
    studySummary: string;
    analysis: string[];
    suggestions: Array<{ title: string; reason: string }>;
    nextRoutePrompt: string;
  };

  if (!config) {
    trackingPayload = buildFallbackTracking({ routeName, evidence });
  } else {
    const content = await callProviderChat({
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      messages: [
        {
          role: "system",
          content:
            "你是学习路线追踪助手。你只输出严格 JSON，必须符合用户给出的结构要求，并且要结合学习进度、完成时间、提交代码片段和当前未完成学习点给出分析。",
        },
        {
          role: "user",
          content: buildPromptContent({ routeName, evidence }),
        },
      ],
    });

    const parsed = parseTrackingJson(content);
    const summary =
      typeof parsed?.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary.trim().slice(0, 240)
        : "当前学习状态已更新。";
    const qualityScore =
      typeof parsed?.qualityScore === "number"
        ? Math.max(0, Math.min(100, Math.round(parsed.qualityScore)))
        : 80;
    const studySummary =
      typeof parsed?.studySummary === "string" &&
      parsed.studySummary.trim().length > 0
        ? parsed.studySummary.trim().slice(0, 360)
        : "当前学习情况已整理完成。";
    const analysis = Array.isArray(parsed?.analysis)
      ? parsed.analysis
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
          .slice(0, 5)
      : [];
    const suggestions = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions
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
              title: suggestion.title.trim().slice(0, 80),
              reason: suggestion.reason.trim().slice(0, 200),
            };
          })
          .filter(
            (
              item,
            ): item is {
              title: string;
              reason: string;
            } => item !== null,
          )
          .slice(0, 4)
      : [];

    trackingPayload = {
      summary,
      qualityScore,
      studySummary,
      analysis:
        analysis.length > 0
          ? analysis
          : ["当前学习状态已更新，但模型未返回可解析的分析要点。"],
      suggestions:
        suggestions.length > 0
          ? suggestions
          : [
              {
                title: "继续完成未完成学习点",
                reason: "优先推进路线中的未完成题目、比赛或讨论任务。",
              },
            ],
      nextRoutePrompt:
        typeof parsed?.nextRoutePrompt === "string" &&
        parsed.nextRoutePrompt.trim().length > 0
          ? parsed.nextRoutePrompt.trim().slice(0, 500)
          : `请根据当前已完成的学习路线 ${routeName}，生成一条新的可编辑学习路径。`,
    };
  }

  await upsertLearningRouteTracking({
    routeId,
    summary: trackingPayload.summary,
    qualityScore: trackingPayload.qualityScore,
    studySummary: trackingPayload.studySummary,
    nextRoutePrompt: trackingPayload.nextRoutePrompt,
    analysis: trackingPayload.analysis,
    suggestions: trackingPayload.suggestions,
    snippets: evidence.snippets,
    completionSignature: evidence.completionSignature,
  });

  return getLearningRouteDetailById({ userId, routeId });
}

export async function refreshLearningRouteTrackingForProblem(params: {
  userId: string;
  problemRef: string;
}) {
  const { userId, problemRef } = params;
  const problem = await prisma.problem.findFirst({
    where: {
      OR: [{ id: problemRef }, { slug: problemRef }],
    },
    select: { id: true, slug: true },
  });

  const searchRefs = Array.from(
    new Set(
      [problemRef, problem?.id ?? null, problem?.slug ?? null].filter(
        Boolean,
      ) as string[],
    ),
  );

  if (searchRefs.length === 0) {
    return [] as Array<
      Awaited<ReturnType<typeof regenerateLearningRouteTracking>>
    >;
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ route_id: string }>>(
    `
      SELECT DISTINCT r.id AS route_id
      FROM learning_routes r
      JOIN learning_route_points p ON p.route_id = r.id
      WHERE r.user_id = ?
        AND p.point_type = 'problem'
        AND p.ref_id IN (${searchRefs.map(() => "?").join(", ")});
    `,
    userId,
    ...searchRefs,
  );

  const updatedRoutes = [] as Array<
    Awaited<ReturnType<typeof regenerateLearningRouteTracking>>
  >;
  for (const row of rows) {
    const updated = await regenerateLearningRouteTracking({
      userId,
      routeId: row.route_id,
    });
    updatedRoutes.push(updated);
  }

  return updatedRoutes;
}

export async function refreshLearningRouteTrackingForRoute(params: {
  userId: string;
  routeId: string;
}) {
  return regenerateLearningRouteTracking(params);
}
