import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FORUM_BOARD_LABEL_MAP } from "@/lib/forum";
import { getProblemCatalog } from "@/lib/problems";
import {
  type GeneratedLearningRoute,
  type LearningRoutePointType,
} from "@/lib/learning-route-types";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const QWEN_API_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type CandidateProblem = {
  slug: string;
  title: string;
  topic: string;
  difficulty: string;
  acceptanceRate: number;
  solvedCount: number;
};

type CandidateContest = {
  id: string;
  title: string;
  type: string;
  format: string;
  status: string;
  participantCount: number;
};

type CandidateForumPost = {
  id: string;
  title: string;
  board: string;
  problemSlug: string | null;
  problemTitle: string | null;
  isPinned: boolean;
  replyCount: number;
};

type AllowedRefs = {
  problemSlugs: Set<string>;
  contestIds: Set<string>;
  forumIds: Set<string>;
  problemTitles: Map<string, string>;
  contestTitles: Map<string, string>;
  forumTitles: Map<string, string>;
};

function getProviderEndpoint(provider: string) {
  if (provider === "qwen") {
    return QWEN_API_URL;
  }

  return DEEPSEEK_API_URL;
}

async function callProviderChat(params: {
  provider: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
}) {
  const { provider, apiKey, model, messages } = params;
  const endpoint = getProviderEndpoint(provider);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.45,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`${provider} route request failed with ${response.status}`);
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

function toSafePointType(value: unknown): LearningRoutePointType {
  if (
    value === "problem" ||
    value === "contest" ||
    value === "forum" ||
    value === "custom"
  ) {
    return value;
  }

  return "custom";
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function buildProblemCatalogSummary(problems: CandidateProblem[]) {
  const grouped = new Map<string, CandidateProblem[]>();

  for (const problem of problems) {
    const list = grouped.get(problem.topic) ?? [];
    list.push(problem);
    grouped.set(problem.topic, list);
  }

  return Array.from(grouped.entries())
    .map(([topic, list]) => {
      const examples = list
        .slice(0, 6)
        .map(
          (item) =>
            `${item.slug}｜${item.title}｜${item.difficulty}｜通过率 ${(item.acceptanceRate * 100).toFixed(1)}%｜过题 ${item.solvedCount} 人`,
        )
        .join("；");
      return `知识点 ${topic}：${examples}`;
    })
    .join("\n");
}

function buildContestCatalogSummary(contests: CandidateContest[]) {
  return contests
    .map(
      (contest) =>
        `${contest.id}｜${contest.title}｜${contest.type}｜${contest.format}｜${contest.status}｜${contest.participantCount} 人`,
    )
    .join("\n");
}

function buildForumCatalogSummary(posts: CandidateForumPost[]) {
  return posts
    .map((post) => {
      const boardLabel =
        FORUM_BOARD_LABEL_MAP[
          post.board as keyof typeof FORUM_BOARD_LABEL_MAP
        ] ?? post.board;
      const relatedProblem = post.problemSlug
        ? `关联题目 ${post.problemSlug}${post.problemTitle ? `（${post.problemTitle}）` : ""}`
        : "无关联题目";
      return `${post.id}｜${post.title}｜${boardLabel}｜${relatedProblem}｜${post.isPinned ? "置顶" : "普通"}｜${post.replyCount} 回复`;
    })
    .join("\n");
}

function fallbackGeneratedRoute(topic: string): GeneratedLearningRoute {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const toDateText = (offset: number) =>
    new Date(now.getTime() + offset * day).toISOString().slice(0, 10);

  return {
    routeName: `${topic} 学习路线`,
    summary:
      "先完成基础知识梳理，再通过题目和讨论逐步强化，最后做一次阶段复盘。",
    points: [
      {
        title: `梳理 ${topic} 的核心概念与模板`,
        description: "阅读官方题解或资料，整理 8-12 条关键结论。",
        pointType: "custom",
        targetDate: toDateText(1),
        status: "pending",
      },
      {
        title: `完成 3 道 ${topic} 基础题`,
        description: "优先选择通过率较高的题，保证方法正确。",
        pointType: "problem",
        targetDate: toDateText(3),
        status: "pending",
      },
      {
        title: `参加 1 场相关练习赛或虚拟赛`,
        description: "以限时方式训练，记录卡点和耗时。",
        pointType: "contest",
        targetDate: toDateText(6),
        status: "pending",
      },
      {
        title: `发布 1 条学习总结讨论帖`,
        description: "总结易错点，并向社区提问未解决问题。",
        pointType: "forum",
        targetDate: toDateText(7),
        status: "pending",
      },
    ],
  };
}

function parseGeneratedRoute(
  raw: string,
  topic: string,
  allowedRefs: AllowedRefs,
): GeneratedLearningRoute {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const jsonText =
      start >= 0 && end > start ? raw.slice(start, end + 1) : raw;

    const parsed = JSON.parse(jsonText) as Partial<GeneratedLearningRoute>;
    const routeName =
      typeof parsed.routeName === "string" && parsed.routeName.trim().length > 0
        ? parsed.routeName.trim().slice(0, 80)
        : `${topic} 学习路线`;

    const summary =
      typeof parsed.summary === "string"
        ? parsed.summary.trim().slice(0, 300)
        : "围绕你的输入与历史行为生成的个性化学习路线。";

    const points = Array.isArray(parsed.points)
      ? parsed.points
          .map((item) => ({
            title:
              typeof item?.title === "string"
                ? item.title.trim().slice(0, 120)
                : "未命名学习点",
            description:
              typeof item?.description === "string"
                ? item.description.trim().slice(0, 280)
                : "",
            pointType: toSafePointType(item?.pointType),
            refId:
              typeof item?.refId === "string" && item.refId.trim().length > 0
                ? item.refId.trim().slice(0, 80)
                : null,
            targetDate:
              typeof item?.targetDate === "string" &&
              item.targetDate.trim().length > 0
                ? item.targetDate.trim().slice(0, 20)
                : null,
            status: "pending" as const,
          }))
          .filter((item) => item.title.length > 0)
          .slice(0, 16)
      : [];

    const validatedPoints = points.map((point) => {
      const refId = point.refId?.trim() || null;
      if (!refId) {
        return point;
      }

      const normalizedTitle = normalizeText(point.title);

      if (point.pointType === "problem") {
        if (allowedRefs.problemSlugs.has(refId)) {
          return point;
        }

        const matched = Array.from(allowedRefs.problemTitles.entries()).find(
          ([title]) => normalizeText(title) === normalizedTitle,
        );
        return {
          ...point,
          refId: matched ? matched[1] : null,
        };
      }

      if (point.pointType === "contest") {
        if (allowedRefs.contestIds.has(refId)) {
          return point;
        }

        const matched = Array.from(allowedRefs.contestTitles.entries()).find(
          ([title]) => normalizeText(title) === normalizedTitle,
        );
        return {
          ...point,
          refId: matched ? matched[1] : null,
        };
      }

      if (point.pointType === "forum") {
        if (allowedRefs.forumIds.has(refId)) {
          return point;
        }

        const matched = Array.from(allowedRefs.forumTitles.entries()).find(
          ([title]) => normalizeText(title) === normalizedTitle,
        );
        return {
          ...point,
          refId: matched ? matched[1] : null,
        };
      }

      return point;
    });

    if (validatedPoints.length === 0) {
      return fallbackGeneratedRoute(topic);
    }

    return { routeName, summary, points: validatedPoints };
  } catch {
    return fallbackGeneratedRoute(topic);
  }
}

function summarizeHistory(params: {
  submissions: Array<{
    createdAt: Date;
    status: string;
    problem: { title: string; topic: string };
  }>;
  posts: Array<{ title: string; board: string }>;
  contests: Array<{ contest: { title: string; status: string } }>;
}) {
  const { submissions, posts, contests } = params;

  const acceptedCount = submissions.filter(
    (submission) => submission.status === "ACCEPTED",
  ).length;

  const topicAttempts = new Map<
    string,
    { attempts: number; accepted: number }
  >();
  for (const submission of submissions) {
    const item = topicAttempts.get(submission.problem.topic) ?? {
      attempts: 0,
      accepted: 0,
    };
    item.attempts += 1;
    if (submission.status === "ACCEPTED") {
      item.accepted += 1;
    }
    topicAttempts.set(submission.problem.topic, item);
  }

  const weakTopics = Array.from(topicAttempts.entries())
    .map(([topic, stat]) => ({
      topic,
      passRate: stat.attempts > 0 ? stat.accepted / stat.attempts : 0,
      attempts: stat.attempts,
    }))
    .filter((item) => item.attempts >= 2)
    .sort((a, b) => a.passRate - b.passRate)
    .slice(0, 4)
    .map((item) => item.topic);

  return {
    submissionCount: submissions.length,
    acceptedCount,
    weakTopics,
    recentProblems: submissions.slice(0, 8).map((item) => item.problem.title),
    recentPosts: posts
      .slice(0, 6)
      .map((item) => `${item.title}(${item.board})`),
    recentContests: contests
      .slice(0, 4)
      .map((item) => `${item.contest.title}(${item.contest.status})`),
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const topic =
      typeof body?.topic === "string" && body.topic.trim().length > 0
        ? body.topic.trim().slice(0, 120)
        : "算法与数据结构";

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
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
            name: true,
          },
        },
        submissions: {
          orderBy: { createdAt: "desc" },
          take: 90,
          select: {
            createdAt: true,
            status: true,
            problem: {
              select: {
                title: true,
                topic: true,
              },
            },
          },
        },
        forumPosts: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            title: true,
            board: true,
          },
        },
        contestRegistrations: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            contest: {
              select: {
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const selectedConfig = user.apiKeyConfigs[0];
    const provider = (
      selectedConfig?.provider ??
      user.aiProvider ??
      "deepseek"
    ).toLowerCase();
    const model = selectedConfig?.model ?? user.aiModel ?? "deepseek-chat";
    const apiKey = selectedConfig?.apiKey ?? user.aiApiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: "请先在设置中配置并启用 API Key" },
        { status: 400 },
      );
    }

    const behavior = summarizeHistory({
      submissions: user.submissions,
      posts: user.forumPosts,
      contests: user.contestRegistrations,
    });

    const [problemCatalog, contestRows, forumRows] = await Promise.all([
      getProblemCatalog(),
      prisma.contest.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 24,
        select: {
          id: true,
          title: true,
          type: true,
          format: true,
          status: true,
          participantCount: true,
        },
      }),
      prisma.forumPost.findMany({
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: 24,
        select: {
          id: true,
          title: true,
          board: true,
          isPinned: true,
          problem: {
            select: { slug: true, title: true },
          },
          _count: {
            select: { comments: true },
          },
        },
      }),
    ]);

    const targetTopics = Array.from(new Set([topic, ...behavior.weakTopics]));

    const candidateProblems = problemCatalog
      .filter((problem) =>
        targetTopics.some(
          (item) =>
            normalizeText(problem.topic) === normalizeText(item) ||
            normalizeText(problem.title).includes(normalizeText(item)),
        ),
      )
      .concat(problemCatalog.slice(0, 20))
      .filter(
        (problem, index, self) =>
          self.findIndex((item) => item.slug === problem.slug) === index,
      )
      .slice(0, 40)
      .map((problem) => ({
        slug: problem.slug,
        title: problem.title,
        topic: problem.topic,
        difficulty: problem.difficulty,
        acceptanceRate: problem.acceptanceRate,
        solvedCount: problem.solvedCount,
      }));

    const candidateContests = contestRows
      .filter((contest) =>
        targetTopics.some(
          (item) =>
            normalizeText(contest.title).includes(normalizeText(item)) ||
            /基础赛|进阶赛|专题赛|训练赛|练习赛|比赛/i.test(contest.title),
        ),
      )
      .concat(contestRows.slice(0, 12))
      .filter(
        (contest, index, self) =>
          self.findIndex((item) => item.id === contest.id) === index,
      )
      .slice(0, 24)
      .map((contest) => ({
        id: contest.id,
        title: contest.title,
        type: contest.type,
        format: contest.format,
        status: contest.status,
        participantCount: contest.participantCount,
      }));

    const candidateForumPosts = forumRows
      .filter((post) =>
        targetTopics.some(
          (item) =>
            normalizeText(post.title).includes(normalizeText(item)) ||
            (post.problem?.title &&
              normalizeText(post.problem.title).includes(normalizeText(item))),
        ),
      )
      .concat(forumRows.slice(0, 12))
      .filter(
        (post, index, self) =>
          self.findIndex((item) => item.id === post.id) === index,
      )
      .slice(0, 24)
      .map((post) => ({
        id: post.id,
        title: post.title,
        board: post.board,
        problemSlug: post.problem?.slug ?? null,
        problemTitle: post.problem?.title ?? null,
        isPinned: post.isPinned,
        replyCount: post._count.comments,
      }));

    const allowedRefs: AllowedRefs = {
      problemSlugs: new Set(candidateProblems.map((item) => item.slug)),
      contestIds: new Set(candidateContests.map((item) => item.id)),
      forumIds: new Set(candidateForumPosts.map((item) => item.id)),
      problemTitles: new Map(
        candidateProblems.map((item) => [item.title, item.slug]),
      ),
      contestTitles: new Map(
        candidateContests.map((item) => [item.title, item.id]),
      ),
      forumTitles: new Map(
        candidateForumPosts.map((item) => [item.title, item.id]),
      ),
    };

    const secondaryTopics = behavior.weakTopics.filter(
      (item) => normalizeText(item) !== normalizeText(topic),
    );

    const prompt = [
      "请生成一个学习路线 JSON（不要输出任何解释文本，只输出 JSON 对象）。",
      "JSON 格式：",
      '{"routeName":"","summary":"","points":[{"title":"","description":"","pointType":"problem|contest|forum|custom","refId":"","targetDate":"YYYY-MM-DD"}]}',
      "规则：",
      "1. 用户输入的学习目标是主线，必须作为学习路线的核心内容，不能被其他薄弱模块替代；如果用户明确指定了动态规划、搜索、图论等主题，必须围绕该主题展开，不要把路线改写成别的主题。",
      "2. 学习路线要循序渐进，建议按 7:3 的比例组织内容：约 70% 聚焦用户输入的主线主题，约 30% 结合历史薄弱点做补强，但补强内容必须服务于主线，不得喧宾夺主。",
      "3. 如果存在前置知识点，先安排前置知识点，再安排主线练习，最后补充后置推荐知识点或拓展训练。",
      "4. points 数量 4-8 个，按时间顺序，内容要从易到难、从概念到实战。",
      "5. 学习点必须可执行，动词开头，描述简洁，尽量明确到可直接执行的任务。",
      "6. 时间线给出未来 1-21 天内的目标日期。",
      "7. refId 必须从下方候选里选择，不允许编造不存在的内容。",
      "8. 如果点名了题目、比赛或讨论帖，请优先使用对应 pointType，并填写候选中的真实 refId。",
      `主线学习目标：${topic}`,
      `可作为补强的薄弱模块：${secondaryTopics.join("、") || "暂无"}`,
      `用户昵称：${user.name}`,
      `最近提交次数：${behavior.submissionCount}`,
      `最近通过次数：${behavior.acceptedCount}`,
      `最近题目：${behavior.recentProblems.join("、") || "暂无"}`,
      `最近论坛活动：${behavior.recentPosts.join("、") || "暂无"}`,
      `最近比赛记录：${behavior.recentContests.join("、") || "暂无"}`,
      "可用真实题目候选（slug｜title｜topic｜difficulty｜acceptanceRate｜solvedCount）：",
      buildProblemCatalogSummary(candidateProblems),
      "可用真实比赛候选（id｜title｜type｜format｜status｜participantCount）：",
      buildContestCatalogSummary(candidateContests),
      "可用真实讨论帖候选（id｜title｜board｜related problem｜pinned｜replyCount）：",
      buildForumCatalogSummary(candidateForumPosts),
    ].join("\n");

    const raw = await callProviderChat({
      provider,
      apiKey,
      model,
      messages: [
        {
          role: "system",
          content:
            "你是在线编程学习平台的学习路径规划器，擅长根据用户明确的学习目标做个性化学习路线，并在不偏离主线的前提下补充前置知识、弱项补强和后置推荐。",
        },
        { role: "user", content: prompt },
      ],
    });

    const generated = parseGeneratedRoute(raw, topic, allowedRefs);

    return NextResponse.json({
      generated,
      provider,
      model,
      configName: selectedConfig?.name ?? null,
    });
  } catch (error) {
    console.error("recommend learning route failed:", error);
    return NextResponse.json(
      { error: "生成学习路线失败，请检查模型配置" },
      { status: 500 },
    );
  }
}
