import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const QWEN_API_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

const requestSchema = z.object({
  query: z.string().trim().min(1).max(80),
});

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type VideoCandidate = {
  id: string;
  title: string;
  url: string;
  author: string;
  duration: string;
  playCount: string;
  danmakuCount: string;
  thumbnail: string;
};

type SelectedVideo = VideoCandidate & {
  reason: string;
  rank: number;
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
      temperature: 0.2,
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

function stripHtmlTags(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeThumbnail(value?: string) {
  if (!value) {
    return "";
  }

  return value.startsWith("//") ? `https:${value}` : value;
}

function normalizeUrl(value: string) {
  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  return value;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/");
}

function buildCandidate(params: {
  id: string;
  title: string;
  url: string;
  author?: string;
  duration?: string;
  playCount?: string;
  danmakuCount?: string;
  thumbnail?: string;
}): VideoCandidate {
  return {
    id: params.id,
    title: params.title,
    url: params.url,
    author: params.author ?? "未知作者",
    duration: params.duration ?? "-",
    playCount: params.playCount ?? "0",
    danmakuCount: params.danmakuCount ?? "0",
    thumbnail: params.thumbnail ?? "",
  };
}

function buildSearchVariants(query: string) {
  const trimmed = query.trim();
  const variants = [
    trimmed,
    `${trimmed} 编程`,
    `${trimmed} 算法`,
    `${trimmed} 数据结构`,
    `${trimmed} 题解`,
  ];

  return Array.from(new Set(variants.filter(Boolean)));
}

const PROGRAMMING_SIGNAL_TERMS = [
  "编程",
  "算法",
  "数据结构",
  "代码",
  "题解",
  "刷题",
  "leetcode",
  "牛客",
  "acm",
  "oj",
  "dfs",
  "bfs",
  "动态规划",
  "回溯",
  "贪心",
  "并查集",
  "图论",
  "树",
  "排序",
  "搜索",
  "递归",
  "链表",
  "栈",
  "队列",
  "堆",
  "c++",
  "python",
  "java",
  "go",
  "rust",
];

const NON_PROGRAMMING_TERMS = [
  "傅立叶",
  "傅里叶",
  "信号处理",
  "离散傅里叶",
  "级数",
  "变换",
  "考研",
  "数学建模",
  "电子",
  "通信",
  "物理",
  "高数",
  "线代",
  "概率论",
  "微积分",
  "运筹学",
  "数电",
  "模电",
];

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => term && text.includes(term.toLowerCase()));
}

function prefilterVideoCandidates(candidates: VideoCandidate[], query: string) {
  const queryText = query.toLowerCase();

  return candidates.filter((candidate) => {
    const candidateText =
      `${candidate.title} ${candidate.author}`.toLowerCase();
    const hasProgrammingSignal = includesAny(
      candidateText,
      PROGRAMMING_SIGNAL_TERMS,
    );
    const hasNonProgrammingSignal = includesAny(
      candidateText,
      NON_PROGRAMMING_TERMS,
    );
    const matchesQuery = queryText
      .split(/[\s,，、\/|]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .some((part) => candidateText.includes(part));

    if (hasNonProgrammingSignal && !hasProgrammingSignal) {
      return false;
    }

    if (hasNonProgrammingSignal && !matchesQuery) {
      return false;
    }

    if (!hasProgrammingSignal && !matchesQuery) {
      return false;
    }

    return true;
  });
}

function extractBilibiliCandidatesFromHtml(html: string) {
  const candidates: VideoCandidate[] = [];
  const seenUrls = new Set<string>();
  const linkPattern =
    /<a href="(?<videoUrl>\/\/www\.bilibili\.com\/video\/BV[^"]+)"[^>]*target="_blank"[^>]*>/g;

  for (const match of html.matchAll(linkPattern)) {
    const videoUrl = normalizeUrl(
      decodeHtmlEntities(match.groups?.videoUrl ?? ""),
    );

    if (!videoUrl || seenUrls.has(videoUrl)) {
      continue;
    }

    const slice = html.slice(match.index ?? 0, (match.index ?? 0) + 5200);
    const titleMatch = slice.match(
      /<h3 class="bili-video-card__info--tit"[^>]*title="([^"]+)"[\s\S]*?<\/h3>/,
    );
    const authorMatch = slice.match(
      /<span class="bili-video-card__info--author"[^>]*>([^<]+)<\/span>/,
    );
    const durationMatch = slice.match(
      /<span class="bili-video-card__stats__duration"[^>]*>([^<]+)<\/span>/,
    );
    const statMatches = [
      ...slice.matchAll(/<span data-v-2fba97cb>([^<]+)<\/span>/g),
    ];
    const thumbnailMatch = slice.match(
      /<img[^>]*src="(\/\/[^\"]+)"[^>]*alt="([^"]*)"/,
    );
    const fallbackThumbnailMatch = slice.match(
      /<source[^>]*srcset="(\/\/[^@\"]+)/,
    );

    const title = decodeHtmlEntities(stripHtmlTags(titleMatch?.[1] ?? ""));
    if (!title) {
      continue;
    }

    candidates.push(
      buildCandidate({
        id: `bilibili-${candidates.length}`,
        title,
        url: videoUrl,
        author: decodeHtmlEntities(
          stripHtmlTags(authorMatch?.[1] ?? "未知作者"),
        ),
        duration: decodeHtmlEntities(stripHtmlTags(durationMatch?.[1] ?? "-")),
        playCount: decodeHtmlEntities(
          stripHtmlTags(statMatches[0]?.[1] ?? "0"),
        ),
        danmakuCount: decodeHtmlEntities(
          stripHtmlTags(statMatches[1]?.[1] ?? "0"),
        ),
        thumbnail: normalizeThumbnail(
          decodeHtmlEntities(
            thumbnailMatch?.[1] ?? fallbackThumbnailMatch?.[1] ?? "",
          ),
        ),
      }),
    );

    seenUrls.add(videoUrl);

    if (candidates.length >= 40) {
      break;
    }
  }

  return candidates;
}

async function fetchBilibiliCandidates(query: string) {
  const url = new URL("https://search.bilibili.com/all");
  url.searchParams.set("keyword", query);
  url.searchParams.set("page", "1");
  url.searchParams.set("order", "totalrank");

  const response = await fetch(url.toString(), {
    headers: {
      Referer: "https://www.bilibili.com/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Bilibili search request failed with ${response.status}`);
  }

  return extractBilibiliCandidatesFromHtml(await response.text());
}

function extractBingCandidatesFromHtml(html: string) {
  const candidates: VideoCandidate[] = [];
  const seenUrls = new Set<string>();
  const linkPattern =
    /<a aria-label="(?<aria>[^"]+)"[^>]*class="mc_vtvc_link[^\"]*"[^>]*href="(?<videoUrl>[^"]+)"[^>]*>/g;

  for (const match of html.matchAll(linkPattern)) {
    const videoUrl = decodeHtmlEntities(match.groups?.videoUrl ?? "");

    if (!videoUrl || seenUrls.has(videoUrl)) {
      continue;
    }

    const slice = html.slice(match.index ?? 0, (match.index ?? 0) + 5200);
    const titleMatch = slice.match(
      /<div class="mc_vtvc_title[^\"]*" title="([^"]+)">[\s\S]*?<strong>([\s\S]*?)<\/strong>/,
    );
    const imageMatch = slice.match(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/);
    const dataSrcMatch = slice.match(/data-src-hq="([^"]+)"/);
    const sourceMatch = slice.match(
      /<div class="mc_vtvc_meta_row"><span>([^<]+)<\/span><span class="mc_vtvc_meta_row_channel">([^<]+)<\/span><\/div>/,
    );
    const durationMatch = slice.match(
      /<div class="mc_bc_rc items">([^<]+)<\/div>/,
    );

    const title = decodeHtmlEntities(
      stripHtmlTags(
        titleMatch?.[1] ?? titleMatch?.[2] ?? match.groups?.aria ?? "",
      ),
    );
    if (!title) {
      continue;
    }

    candidates.push(
      buildCandidate({
        id: `bing-${candidates.length}`,
        title,
        url: videoUrl,
        author: decodeHtmlEntities(
          stripHtmlTags(sourceMatch?.[2] ?? sourceMatch?.[1] ?? "未知作者"),
        ),
        duration: decodeHtmlEntities(stripHtmlTags(durationMatch?.[1] ?? "-")),
        playCount: "0",
        danmakuCount: "0",
        thumbnail: normalizeThumbnail(
          decodeHtmlEntities(imageMatch?.[1] ?? dataSrcMatch?.[1] ?? ""),
        ),
      }),
    );

    seenUrls.add(videoUrl);

    if (candidates.length >= 40) {
      break;
    }
  }

  return candidates;
}

async function fetchBingCandidates(query: string) {
  const url = new URL("https://cn.bing.com/videos/search");
  url.searchParams.set("q", query);

  const response = await fetch(url.toString(), {
    headers: {
      Referer: "https://cn.bing.com/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Bing video search request failed with ${response.status}`);
  }

  return extractBingCandidatesFromHtml(await response.text());
}

async function fetchSearchCandidates(query: string) {
  const searchVariants = buildSearchVariants(query);
  const settledResults = await Promise.allSettled(
    searchVariants.flatMap((variant) => [
      fetchBilibiliCandidates(variant),
      fetchBingCandidates(variant),
    ]),
  );

  const candidates = settledResults.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  const seenUrls = new Set<string>();
  return candidates.filter((candidate) => {
    if (seenUrls.has(candidate.url)) {
      return false;
    }

    seenUrls.add(candidate.url);
    return true;
  });
}

async function rankVideosWithLLM(params: {
  provider: string;
  model: string;
  apiKey: string;
  query: string;
  candidates: VideoCandidate[];
}) {
  const { provider, model, apiKey, query, candidates } = params;
  const prompt = [
    "你是一个严格的编程学习视频筛选助手。只允许推荐与编程、算法、数据结构、代码讲解、题目分析直接相关的视频。",
    `用户薄弱点关键词：${query}`,
    "筛选规则：",
    "1. 优先选择讲解清晰、适合学习、能补足薄弱点的视频。",
    "2. 必须排除数学、信号处理、离散傅里叶、考研、电子、通信、物理等非编程主题的视频，即使标题里出现 DFS、DFT 等缩写也不要误判。",
    "3. 如果候选里有基础讲解、专题总结、实战演示、题目推导或代码演示，优先保留。",
    "4. 尽量避免纯娱乐、纯剪辑、标题党内容，以及和关键词只在字母缩写上相似但主题无关的视频。",
    "5. 最多返回 3 个视频，按最推荐到次推荐排序，并尽量覆盖不同讲解角度。",
    "6. 返回严格 JSON，不要输出 Markdown、解释或多余文字。",
    '7. JSON 格式必须是 {"items":[{"id":"candidate-1","reason":"..."}]}，reason 用一句中文说明筛选原因。',
    "候选视频列表：",
    formatCandidateList(candidates),
  ].join("\n");

  const content = await callProviderChat({
    provider,
    apiKey,
    model,
    messages: [
      {
        role: "system",
        content:
          "你是一个专注于编程学习视频推荐的助手，输出必须可解析为 JSON。",
      },
      { role: "user", content: prompt },
    ],
  });

  return extractSelectionItems(content);
}

function buildFallbackSelection(candidates: VideoCandidate[], query: string) {
  const queryParts = query
    .split(/[\s,，、\/|]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const scored = candidates.map((candidate, index) => {
    const title = candidate.title.toLowerCase();
    const author = candidate.author.toLowerCase();
    const matchedScore = queryParts.reduce((score, part) => {
      const normalized = part.toLowerCase();
      if (!normalized) {
        return score;
      }

      return (
        score +
        (title.includes(normalized) ? 4 : 0) +
        (author.includes(normalized) ? 1 : 0)
      );
    }, 0);

    return {
      candidate,
      score: matchedScore + (candidates.length - index) * 0.01,
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ candidate }, rank) => ({
      ...candidate,
      reason: "根据标题与关键词命中度优先保留的补弱视频。",
      rank: rank + 1,
    }));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "请输入 1 到 80 个字符的薄弱点关键词" },
        { status: 400 },
      );
    }

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
            name: true,
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
        { error: "请先在设置中配置并选中 API Key" },
        { status: 400 },
      );
    }

    const candidates = prefilterVideoCandidates(
      await fetchSearchCandidates(parsed.data.query),
      parsed.data.query,
    );

    if (candidates.length === 0) {
      return NextResponse.json({
        query: parsed.data.query,
        provider,
        model,
        configName: selectedConfig?.name ?? null,
        totalCandidates: 0,
        items: [],
      });
    }

    let selectedItems = buildFallbackSelection(candidates, parsed.data.query);

    try {
      const selectedIds = await rankVideosWithLLM({
        provider,
        model,
        apiKey,
        query: parsed.data.query,
        candidates,
      });

      if (selectedIds.length > 0) {
        const byId = new Map(
          candidates.map((candidate) => [candidate.id, candidate]),
        );
        const picked = selectedIds
          .map(({ id, reason }, index) => {
            const candidate = byId.get(id);
            if (!candidate) {
              return null;
            }

            return {
              ...candidate,
              reason: reason || "根据大模型筛选后的补弱视频。",
              rank: index + 1,
            };
          })
          .filter((item): item is SelectedVideo => Boolean(item));

        const pickedIds = new Set(picked.map((item) => item.id));
        const remainder = candidates.filter(
          (candidate) => !pickedIds.has(candidate.id),
        );
        selectedItems = [
          ...picked,
          ...buildFallbackSelection(remainder, parsed.data.query),
        ].slice(0, 12);
      }
    } catch (rankError) {
      console.error(
        "Video ranking failed, falling back to heuristic selection:",
        rankError,
      );
    }

    return NextResponse.json({
      query: parsed.data.query,
      provider,
      model,
      configName: selectedConfig?.name ?? null,
      totalCandidates: candidates.length,
      items: selectedItems.slice(0, 3),
    });
  } catch (error) {
    console.error("Video search request failed:", error);
    return NextResponse.json(
      { error: "视频搜索失败，请检查网络或模型配置后重试" },
      { status: 500 },
    );
  }
}
