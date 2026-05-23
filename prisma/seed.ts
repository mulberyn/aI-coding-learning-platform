import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  Difficulty,
  PrismaClient,
  ProblemType,
  Role,
  ContestType,
  ContestFormat,
  ContestStatus,
  ForumBoard,
} from "@prisma/client";

const prisma = new PrismaClient();

type ProblemSeed = {
  problemNumber: number;
  slug: string;
  title: string;
  topic: string;
  source: string;
  difficulty: Difficulty;
  type: ProblemType;
  acceptanceRate: number;
  statement: string;
  sampleInput: string;
  sampleOutput: string;
  sampleExplanation: string;
  hiddenInput: string;
  hiddenOutput: string;
  traditionalInputFormat: string;
  traditionalOutputFormat: string;
  dataRange: string;
};

type ProblemTemplate = {
  title: string;
  focus: string;
};

type ProblemGroup = {
  topic: string;
  baseAcceptanceRate: number;
  inputFormat: string;
  outputFormat: string;
  dataRange: string;
  sampleInput: string;
  sampleOutput: string;
  sampleExplanation: string;
  hiddenInput: string;
  hiddenOutput: string;
  items: ProblemTemplate[];
};

const difficulties = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];

function loadProblemStatements() {
  const catalogPath = path.join(
    process.cwd(),
    "prisma",
    "problem-statements",
    "catalog.md",
  );
  const content = readFileSync(catalogPath, "utf8");
  const headingPattern = /^##\s+(ALG\d{4})\s+.+$/gm;
  const matches = Array.from(content.matchAll(headingPattern));
  const statements = new Map<string, string>();

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const start = (current.index ?? 0) + current[0].length;
    const end = next?.index ?? content.length;
    statements.set(current[1], content.slice(start, end).trim());
  }

  return statements;
}

const problemStatements = loadProblemStatements();

function getProblemStatement(slug: string) {
  const statement = problemStatements.get(slug);
  if (!statement) {
    throw new Error(`Missing problem statement for ${slug}`);
  }

  return statement;
}

const problemGroups: ProblemGroup[] = [
  {
    topic: "数组基础",
    baseAcceptanceRate: 0.72,
    inputFormat: "第一行一个整数 n，第二行输入 n 个整数 a_i。",
    outputFormat: "输出一个整数，表示题目要求的答案。",
    dataRange: "$1 \\le n \\le 10^5$，$-10^9 \\le a_i \\le 10^9$。",
    sampleInput: "5\n1 3 2 4 5\n",
    sampleOutput: "15\n",
    sampleExplanation: "示例中需要对数组进行基础统计或变换后得到答案。",
    hiddenInput: "4\n2 1 4 3\n",
    hiddenOutput: "10\n",
    items: [
      { title: "相邻对求和", focus: "相邻元素统计" },
      { title: "前缀最大值", focus: "前缀维护" },
      { title: "区间和查询", focus: "区间累加" },
      { title: "差分修改", focus: "区间加法" },
      { title: "去重统计", focus: "重复元素过滤" },
      { title: "旋转数组", focus: "循环位移" },
      { title: "窗口计数", focus: "滑动窗口计数" },
      { title: "子数组极值", focus: "子数组最值" },
      { title: "双指针合并", focus: "双指针归并" },
      { title: "模拟打卡", focus: "数组模拟" },
    ],
  },
  {
    topic: "搜索",
    baseAcceptanceRate: 0.62,
    inputFormat:
      "第一行输入两个整数 n 和 q，第二行输入一个有序数组，后续为若干查询。",
    outputFormat: "对每个查询输出对应位置或结果。",
    dataRange: "$1 \\le n,q \\le 10^5$，数组单调不降。",
    sampleInput: "6 4\n1 3 5 7 9 11\n7\n",
    sampleOutput: "4\n",
    sampleExplanation: "样例展示如何在有序序列上完成定位。",
    hiddenInput: "5 1\n2 4 6 8 10\n8\n",
    hiddenOutput: "4\n",
    items: [
      { title: "二分定位", focus: "二分查找" },
      { title: "最左满足", focus: "左边界搜索" },
      { title: "最右满足", focus: "右边界搜索" },
      { title: "整数平方根", focus: "答案二分" },
      { title: "旋转数组最小值", focus: "旋转序列搜索" },
      { title: "有序区间查询", focus: "区间定位" },
      { title: "第一次出现", focus: "首次匹配" },
      { title: "最近合法位置", focus: "最近满足条件的位置" },
      { title: "答案二分", focus: "单调性判定" },
      { title: "插入位置", focus: "有序插入" },
    ],
  },
  {
    topic: "图论",
    baseAcceptanceRate: 0.48,
    inputFormat: "第一行输入 n 和 m，接下来 m 行描述边或邻接关系。",
    outputFormat: "输出连通性、最短路或图结构的统计结果。",
    dataRange: "$1 \\le n \\le 10^5$，$1 \\le m \\le 2 \\times 10^5$。",
    sampleInput: "4 3\n1 2\n2 3\n3 4\n",
    sampleOutput: "1\n",
    sampleExplanation: "样例表示一个简单链式图。",
    hiddenInput: "5 4\n1 2\n2 3\n4 5\n3 4\n",
    hiddenOutput: "1\n",
    items: [
      { title: "连通块计数", focus: "深度优先遍历" },
      { title: "广度优先最短路", focus: "BFS 最短路" },
      { title: "拓扑排序", focus: "有向无环图排序" },
      { title: "二分图染色", focus: "二分图判断" },
      { title: "树的直径", focus: "树上两遍搜索" },
      { title: "单源最短路", focus: "Dijkstra 或 SPFA" },
      { title: "多源扩散", focus: "多源 BFS" },
      { title: "环检测", focus: "图中成环判断" },
      { title: "最小生成树", focus: "Kruskal 或 Prim" },
      { title: "强连通分量", focus: "SCC 分解" },
    ],
  },
  {
    topic: "动态规划",
    baseAcceptanceRate: 0.36,
    inputFormat: "第一行输入 n，后续根据题意输入权值、状态或字符串。",
    outputFormat: "输出最优值或方案数。",
    dataRange: "$1 \\le n \\le 10^5$，状态数按题目限制给定。",
    sampleInput: "5\n2 3 4 5 6\n10\n",
    sampleOutput: "15\n",
    sampleExplanation: "样例演示如何建立状态并转移。",
    hiddenInput: "4\n1 4 2 7\n9\n",
    hiddenOutput: "13\n",
    items: [
      { title: "01 背包入门", focus: "容量型动态规划" },
      { title: "完全背包入门", focus: "无限次转移" },
      { title: "最长递增子序列", focus: "序列 DP" },
      { title: "区间动态规划", focus: "区间合并" },
      { title: "树形动态规划", focus: "树上状态转移" },
      { title: "状态压缩入门", focus: "集合状态枚举" },
      { title: "数位动态规划", focus: "按位计数" },
      { title: "路径计数", focus: "网格路径 DP" },
      { title: "编辑距离", focus: "字符串转移" },
      { title: "方案统计", focus: "计数型动态规划" },
    ],
  },
  {
    topic: "贪心",
    baseAcceptanceRate: 0.56,
    inputFormat: "第一行输入 n，随后输入若干区间、任务或资源描述。",
    outputFormat: "输出贪心得到的最优结果。",
    dataRange: "$1 \\le n \\le 10^5$，区间端点和权值满足题目约束。",
    sampleInput: "4\n1 3\n2 4\n4 6\n7 8\n",
    sampleOutput: "3\n",
    sampleExplanation: "样例展示如何按贪心规则选择方案。",
    hiddenInput: "5\n1 2\n2 5\n4 7\n6 9\n8 10\n",
    hiddenOutput: "2\n",
    items: [
      { title: "区间选择", focus: "区间调度" },
      { title: "任务安排", focus: "截止时间排序" },
      { title: "跳跃游戏", focus: "最远可达性" },
      { title: "最少删除", focus: "局部最优" },
      { title: "会议室分配", focus: "资源分配" },
      { title: "字典序构造", focus: "构造最小序列" },
      { title: "资源分配", focus: "优先级选择" },
      { title: "合并代价", focus: "最优合并顺序" },
      { title: "追击问题", focus: "反向贪心" },
      { title: "货仓选址", focus: "中位数贪心" },
    ],
  },
];

function buildGeneratedProblemSeeds() {
  const seeds: ProblemSeed[] = [];
  let problemNumber = 1;

  for (const group of problemGroups) {
    for (const [index, item] of group.items.entries()) {
      const number = problemNumber++;
      const slug = `ALG${String(number).padStart(4, "0")}`;
      const difficulty = difficulties[index % difficulties.length];

      seeds.push({
        problemNumber: number,
        slug,
        title: item.title,
        topic: group.topic,
        source: "算法题",
        difficulty,
        type: ProblemType.TRADITIONAL,
        acceptanceRate: Number(
          (group.baseAcceptanceRate + (index % 4) * 0.04).toFixed(2),
        ),
        statement: getProblemStatement(slug),
        sampleInput: group.sampleInput,
        sampleOutput: group.sampleOutput,
        sampleExplanation: group.sampleExplanation,
        hiddenInput: group.hiddenInput,
        hiddenOutput: group.hiddenOutput,
        traditionalInputFormat: group.inputFormat,
        traditionalOutputFormat: group.outputFormat,
        dataRange: group.dataRange,
      });
    }
  }

  return seeds;
}

const generatedProblemSeeds = buildGeneratedProblemSeeds();

async function seedUsers() {
  const users = [
    {
      email: "student@example.com",
      name: "Demo Student",
      role: Role.STUDENT,
      password: "password123",
    },
    {
      email: "teacher@example.com",
      name: "Demo Teacher",
      role: Role.TEACHER,
      password: "password123",
    },
    {
      email: "admin@example.com",
      name: "Demo Admin",
      role: Role.ADMIN,
      password: "password123",
    },
    {
      email: "alice@example.com",
      name: "Alice Chen",
      role: Role.STUDENT,
      password: "password123",
    },
    {
      email: "bob@example.com",
      name: "Bob Wang",
      role: Role.STUDENT,
      password: "password123",
    },
    {
      email: "charlie@example.com",
      name: "Charlie Liu",
      role: Role.STUDENT,
      password: "password123",
    },
    {
      email: "diana@example.com",
      name: "Diana Zhang",
      role: Role.STUDENT,
      password: "password123",
    },
    {
      email: "eve@example.com",
      name: "Eve Li",
      role: Role.STUDENT,
      password: "password123",
    },
    {
      email: "frank@example.com",
      name: "Frank Yang",
      role: Role.STUDENT,
      password: "password123",
    },
    {
      email: "grace@example.com",
      name: "Grace Huang",
      role: Role.STUDENT,
      password: "password123",
    },
    {
      email: "henry@example.com",
      name: "Henry Sun",
      role: Role.STUDENT,
      password: "password123",
    },
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash,
      },
    });
  }
}

async function seedProblems() {
  await prisma.judgeResult.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.example.deleteMany();
  await prisma.problem.deleteMany();

  for (const item of generatedProblemSeeds) {
    const examples = [
      {
        input: item.sampleInput,
        output: item.sampleOutput,
        explanation: item.sampleExplanation,
      },
    ];
    const testCases = [
      {
        input: item.sampleInput,
        expectedOutput: item.sampleOutput,
        isSample: true,
      },
      {
        input: item.hiddenInput,
        expectedOutput: item.hiddenOutput,
        isSample: false,
      },
    ];

    await prisma.problem.create({
      data: {
        slug: item.slug,
        problemNumber: item.problemNumber,
        title: item.title,
        statement: item.statement,
        topic: item.topic,
        source: item.source,
        difficulty: item.difficulty,
        type: item.type,
        acceptanceRate: item.acceptanceRate,
        functionName: null,
        functionSignature: null,
        traditionalInputFormat: item.traditionalInputFormat,
        traditionalOutputFormat: item.traditionalOutputFormat,
        timeLimitMs: 1000,
        memoryLimitMb: 256,
        examples: {
          create: examples.map((example, index) => ({
            input: example.input,
            output: example.output,
            explanation: example.explanation,
            sortOrder: index,
          })),
        },
        testCases: {
          create: testCases.map((testCase, index) => ({
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            isSample: testCase.isSample,
            sortOrder: index,
            points: 1,
          })),
        },
      },
    });
  }
}

async function seedContests() {
  // 获取前4道题目
  const problems = await prisma.problem.findMany({
    take: 4,
    orderBy: { createdAt: "asc" },
  });

  // 删除现有比赛数据
  await prisma.contestRegistration.deleteMany();
  await prisma.contestRanking.deleteMany();
  await prisma.contestProblem.deleteMany();
  await prisma.contest.deleteMany();

  // 创建"数据结构基础赛"
  const contest = await prisma.contest.create({
    data: {
      title: "数据结构基础赛",
      description: "这是一场专注于数据结构基础知识的比赛",
      type: ContestType.OFFICIAL,
      format: ContestFormat.OI,
      status: ContestStatus.ENDED,
      startTime: new Date(Date.now() - 1209600000), // 14天前
      endTime: new Date(Date.now() - 1206000000),
      duration: 90,
      participantCount: 267,
      announcement: `# 比赛公告

欢迎参加数据结构基础赛！

## 比赛说明

- 本场比赛共有 4 道题目，总分 100 分
- 采用 OI 赛制，根据通过的测试点数来计分
- 比赛期间可查看实时排名
- 禁止使用任何外部工具或资源，违反规定将被取消成绩

## 重要提示

- 请在比赛开始前检查网络连接
- 建议在比赛结束前 15 分钟完成最后提交
- 如遇技术问题，请及时联系管理员

## 时间安排

- **比赛时间**：90 分钟
- **提交截止时间**：比赛结束时
- **成绩公布时间**：比赛结束后立即公布

## 评分规则

- 每道题 25 分
- OI 赛制，部分正确会得到相应分数
- 时间复杂度不是评分标准，但建议优化`,
    },
  });

  // 添加题目
  for (let i = 0; i < problems.length; i++) {
    await prisma.contestProblem.create({
      data: {
        contestId: contest.id,
        problemId: problems[i].id,
        number: i + 1,
        fullScore: 25,
      },
    });
  }

  // 获取用户列表（跳过教师和管理员）
  const users = await prisma.user.findMany({
    where: { role: Role.STUDENT },
  });

  // 创建排行榜数据
  const rankings = [
    {
      username: "algorithm_master",
      totalScore: 100,
      penalty: 0,
      details: [
        { problemId: problems[0].id, solved: true, attempts: 1, time: 5 },
        { problemId: problems[1].id, solved: true, attempts: 2, time: 12 },
        { problemId: problems[2].id, solved: true, attempts: 1, time: 18 },
        { problemId: problems[3].id, solved: true, attempts: 3, time: 35 },
      ],
    },
    {
      username: "data_struct_expert",
      totalScore: 100,
      penalty: 0,
      details: [
        { problemId: problems[0].id, solved: true, attempts: 1, time: 8 },
        { problemId: problems[1].id, solved: true, attempts: 1, time: 14 },
        { problemId: problems[2].id, solved: true, attempts: 2, time: 25 },
        { problemId: problems[3].id, solved: true, attempts: 2, time: 38 },
      ],
    },
    {
      username: "coding_enthusiast",
      totalScore: 75,
      penalty: 0,
      details: [
        { problemId: problems[0].id, solved: true, attempts: 1, time: 6 },
        { problemId: problems[1].id, solved: true, attempts: 1, time: 16 },
        { problemId: problems[2].id, solved: true, attempts: 3, time: 28 },
        { problemId: problems[3].id, solved: false, attempts: 4, time: 45 },
      ],
    },
    {
      username: "java_lover",
      totalScore: 75,
      penalty: 0,
      details: [
        { problemId: problems[0].id, solved: true, attempts: 2, time: 10 },
        { problemId: problems[1].id, solved: true, attempts: 1, time: 18 },
        { problemId: problems[2].id, solved: false, attempts: 5, time: 50 },
        { problemId: problems[3].id, solved: true, attempts: 2, time: 32 },
      ],
    },
    {
      username: "python_coder",
      totalScore: 50,
      penalty: 0,
      details: [
        { problemId: problems[0].id, solved: true, attempts: 1, time: 7 },
        { problemId: problems[1].id, solved: false, attempts: 3, time: 40 },
        { problemId: problems[2].id, solved: true, attempts: 2, time: 22 },
        { problemId: problems[3].id, solved: false, attempts: 6, time: 60 },
      ],
    },
    {
      username: "cpp_beginner",
      totalScore: 50,
      penalty: 0,
      details: [
        { problemId: problems[0].id, solved: true, attempts: 1, time: 4 },
        { problemId: problems[1].id, solved: false, attempts: 2, time: 25 },
        { problemId: problems[2].id, solved: false, attempts: 4, time: 55 },
        { problemId: problems[3].id, solved: true, attempts: 2, time: 50 },
      ],
    },
    {
      username: "competitive_prog",
      totalScore: 50,
      penalty: 0,
      details: [
        { problemId: problems[0].id, solved: true, attempts: 2, time: 9 },
        { problemId: problems[1].id, solved: true, attempts: 1, time: 15 },
        { problemId: problems[2].id, solved: false, attempts: 5, time: 50 },
        { problemId: problems[3].id, solved: false, attempts: 4, time: 60 },
      ],
    },
    {
      username: "learning_path",
      totalScore: 25,
      penalty: 0,
      details: [
        { problemId: problems[0].id, solved: true, attempts: 1, time: 11 },
        { problemId: problems[1].id, solved: false, attempts: 2, time: 20 },
        { problemId: problems[2].id, solved: false, attempts: 3, time: 35 },
        { problemId: problems[3].id, solved: false, attempts: 2, time: 30 },
      ],
    },
    {
      username: "newbie_coder",
      totalScore: 25,
      penalty: 0,
      details: [
        { problemId: problems[0].id, solved: false, attempts: 3, time: 20 },
        { problemId: problems[1].id, solved: true, attempts: 1, time: 13 },
        { problemId: problems[2].id, solved: false, attempts: 2, time: 28 },
        { problemId: problems[3].id, solved: false, attempts: 1, time: 15 },
      ],
    },
    {
      username: "dream_coder",
      totalScore: 0,
      penalty: 0,
      details: [
        { problemId: problems[0].id, solved: false, attempts: 2, time: 15 },
        { problemId: problems[1].id, solved: false, attempts: 1, time: 10 },
        { problemId: problems[2].id, solved: false, attempts: 1, time: 12 },
        { problemId: problems[3].id, solved: false, attempts: 1, time: 8 },
      ],
    },
  ];

  for (let i = 0; i < rankings.length; i++) {
    await prisma.contestRanking.create({
      data: {
        contestId: contest.id,
        rank: i + 1,
        userId: `user_${i.toString().padStart(3, "0")}`,
        username: rankings[i].username,
        totalScore: rankings[i].totalScore,
        penalty: rankings[i].penalty,
        details: JSON.stringify(rankings[i].details),
      },
    });
  }

  console.log("✓ Created contest: 数据结构基础赛");

  const upcomingContest = await prisma.contest.create({
    data: {
      title: "2026 春季算法预备赛",
      description: "一场尚未开始的练习赛，允许提前报名。",
      type: ContestType.INDIVIDUAL_PUBLIC,
      format: ContestFormat.IOI,
      status: ContestStatus.NOT_STARTED,
      startTime: new Date(Date.now() + 259200000), // 3天后
      endTime: new Date(Date.now() + 259200000 + 7200000),
      duration: 120,
      participantCount: 0,
      announcement: `# 2026 春季算法预备赛

欢迎提前报名这场尚未开始的比赛。

## 赛前说明

- 比赛开始前可报名
- 比赛开始后将自动进入正式作答阶段
- 采用 IOI 赛制，支持部分分

## 时间安排

- **开始时间**：3 天后
- **比赛时长**：120 分钟
`,
    },
  });

  for (let i = 0; i < problems.length; i++) {
    await prisma.contestProblem.create({
      data: {
        contestId: upcomingContest.id,
        problemId: problems[i].id,
        number: i + 1,
        fullScore: 25,
      },
    });
  }

  console.log("✓ Created contest: 2026 春季算法预备赛");
}

async function seedForum() {
  await prisma.forumComment.deleteMany();
  await prisma.forumPost.deleteMany();

  const users = await prisma.user.findMany({
    where: { role: Role.STUDENT },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const problems = await prisma.problem.findMany({
    select: { id: true, slug: true, problemNumber: true },
  });

  if (users.length < 6) {
    throw new Error("Need at least 6 student users to seed forum data");
  }

  const problemIdBySlug = new Map(problems.map((item) => [item.slug, item.id]));

  const posts = [
    {
      title: "【版务】论坛发帖规范与常见问题汇总",
      content: `欢迎来到论坛，请先阅读以下规范：\n\n1. 标题尽量清晰，不要只写“求助”。\n2. 题解类内容建议补充复杂度分析。\n3. 请文明交流，避免人身攻击。\n\n如需反馈站点问题，请在站务版发帖。`,
      board: ForumBoard.SITE,
      isPinned: true,
      userIndex: 0,
      problemSlug: null,
      createdAt: "2026-05-01T09:20:00.000Z",
      comments: [
        {
          userIndex: 2,
          content: "收到，建议再补一条关于代码块格式的说明。",
          createdAt: "2026-05-01T10:00:00.000Z",
        },
      ],
    },
    {
      title: "秋招算法岗简历项目怎么写更容易过筛？",
      content: `最近在整理简历，OJ 项目部分准备写：\n\n- 题库与评测系统\n- 比赛与排行榜\n- 讨论论坛与统计\n\n大家觉得更看重“功能完整度”还是“工程质量（测试/部署）”？`,
      board: ForumBoard.JOB,
      isPinned: false,
      userIndex: 1,
      problemSlug: null,
      createdAt: "2026-05-02T08:10:00.000Z",
      comments: [
        {
          userIndex: 4,
          content: "优先写工程质量，最好能附上性能数据和线上地址。",
          createdAt: "2026-05-02T09:00:00.000Z",
        },
        {
          userIndex: 5,
          content: "建议加一段你做过的系统设计取舍，会很加分。",
          createdAt: "2026-05-02T11:15:00.000Z",
        },
      ],
    },
    {
      title: "P0001 相邻对求和：为什么前缀和能稳定过大数据？",
      content: `我一开始用了双重循环，后来改成前缀和后复杂度降到了 O(n)。\n\n\`\`\`text\n区间和(l, r) = prefix[r] - prefix[l - 1]\n\`\`\`\n\n想确认下这题是否还有更优写法？`,
      board: ForumBoard.PROBLEM,
      isPinned: true,
      userIndex: 3,
      problemSlug: "P0001",
      createdAt: "2026-05-03T06:45:00.000Z",
      comments: [
        {
          userIndex: 0,
          content: "这题前缀和已经是最优思路之一，注意边界就行。",
          createdAt: "2026-05-03T07:00:00.000Z",
        },
        {
          userIndex: 2,
          content: "可以再补一个 long long 的说明，防止溢出。",
          createdAt: "2026-05-03T07:26:00.000Z",
        },
      ],
    },
    {
      title: "关于 ICPC 赛制中罚时计算的一个小疑问",
      content: `看了几场比赛后发现不同平台的罚时实现细节不完全一致，\n主要差异在于“封榜后提交”的处理。\n\n有没有同学整理过标准规则链接？`,
      board: ForumBoard.ACADEMIC,
      isPinned: false,
      userIndex: 2,
      problemSlug: null,
      createdAt: "2026-05-03T11:10:00.000Z",
      comments: [
        {
          userIndex: 0,
          content: "可以看 ICPC RuleBook 官方 PDF，建议以当年版本为准。",
          createdAt: "2026-05-03T11:40:00.000Z",
        },
      ],
    },
    {
      title: "P0004 窗口得分：单调队列写法求 review",
      content: `代码能过样例，但我担心在重复元素时会出错。\n\n如果队尾值和当前值相等，应该保留旧值还是新值？`,
      board: ForumBoard.PROBLEM,
      isPinned: false,
      userIndex: 4,
      problemSlug: "P0004",
      createdAt: "2026-05-04T02:30:00.000Z",
      comments: [
        {
          userIndex: 1,
          content: "建议保留新的下标，窗口滑动时更直观。",
          createdAt: "2026-05-04T02:55:00.000Z",
        },
      ],
    },
    {
      title: "站务建议：讨论区支持按题号快速跳转",
      content: `现在筛选已经有题号输入，能否在帖子里识别类似 #P0007 的标记并自动链接？`,
      board: ForumBoard.SITE,
      isPinned: false,
      userIndex: 5,
      problemSlug: null,
      createdAt: "2026-05-04T08:00:00.000Z",
      comments: [],
    },
    {
      title: "算法学习方向：图论先学最短路还是最小生成树？",
      content: `如果每周只有 6 小时刷题时间，你们会怎么安排图论学习顺序？`,
      board: ForumBoard.ACADEMIC,
      isPinned: false,
      userIndex: 0,
      problemSlug: null,
      createdAt: "2026-05-04T13:12:00.000Z",
      comments: [
        {
          userIndex: 3,
          content: "我建议先最短路，再并查集+MST，最后网络流。",
          createdAt: "2026-05-04T14:02:00.000Z",
        },
      ],
    },
    {
      title: "实习面试常见手撕题，大家都怎么复习？",
      content: `目前在复习链表、二叉树和基础 DP。\n\n有没有推荐的高频题单？`,
      board: ForumBoard.JOB,
      isPinned: false,
      userIndex: 3,
      problemSlug: null,
      createdAt: "2026-05-05T03:20:00.000Z",
      comments: [],
    },
    {
      title: "P0009 资源队列：我的模拟总是差一个边界",
      content: `我在处理“队列为空”与“新任务到达”同时发生时会 WA，\n请问这类事件驱动模拟有什么通用模板？`,
      board: ForumBoard.PROBLEM,
      isPinned: false,
      userIndex: 1,
      problemSlug: "P0009",
      createdAt: "2026-05-05T06:40:00.000Z",
      comments: [
        {
          userIndex: 2,
          content: "建议先处理结束事件，再处理到达事件，保持顺序一致。",
          createdAt: "2026-05-05T07:03:00.000Z",
        },
      ],
    },
    {
      title: "论文复现时，实验日志该如何结构化记录？",
      content: `想请教大家在做算法论文复现时，实验日志是如何组织的？\n\n我现在用 Markdown + 表格。`,
      board: ForumBoard.ACADEMIC,
      isPinned: false,
      userIndex: 4,
      problemSlug: null,
      createdAt: "2026-05-05T10:30:00.000Z",
      comments: [],
    },
    {
      title: "P0012 旋转轨迹：有没有更直观的几何解释？",
      content: `这题我能写出代码，但对“坐标变换”的理解不够稳定。\n如果有图示讲解会更容易记住。`,
      board: ForumBoard.PROBLEM,
      isPinned: false,
      userIndex: 5,
      problemSlug: "P0012",
      createdAt: "2026-05-06T02:45:00.000Z",
      comments: [],
    },
    {
      title: "站务：建议增加讨论帖草稿自动保存",
      content: `今天写长帖时浏览器崩了，内容全没了。\n\n希望后续能加本地草稿缓存。`,
      board: ForumBoard.SITE,
      isPinned: false,
      userIndex: 2,
      problemSlug: null,
      createdAt: "2026-05-06T05:25:00.000Z",
      comments: [],
    },
  ] as const;

  for (const post of posts) {
    const createdPost = await prisma.forumPost.create({
      data: {
        title: post.title,
        content: post.content,
        board: post.board,
        isPinned: post.isPinned,
        userId: users[post.userIndex % users.length].id,
        problemId: post.problemSlug
          ? (problemIdBySlug.get(post.problemSlug) ?? null)
          : null,
        createdAt: new Date(post.createdAt),
      },
    });

    for (const comment of post.comments) {
      await prisma.forumComment.create({
        data: {
          postId: createdPost.id,
          userId: users[comment.userIndex % users.length].id,
          content: comment.content,
          createdAt: new Date(comment.createdAt),
        },
      });
    }
  }

  console.log("✓ Created forum posts and comments");
}

async function main() {
  await seedUsers();
  await seedProblems();
  await seedContests();
  await seedForum();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
