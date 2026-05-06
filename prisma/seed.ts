import bcrypt from "bcryptjs";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  Difficulty,
  PrismaClient,
  ProblemType,
  Role,
  ContestType,
  ContestFormat,
  ContestStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

type ProblemMeta = {
  problemNumber: number;
  slug: string;
  title: string;
  topic: string;
  source: string;
  difficulty: Difficulty;
  type: ProblemType;
  acceptanceRate: number;
};

type ProblemCaseConfig = {
  slug: string;
  title: string;
  desc: string;
  inFmt: string;
  outFmt: string;
  range: string;
  sampleIn: string;
  sampleOut: string;
  sampleExp: string;
  hiddenIn: string;
  hiddenOut: string;
};

const problemTitles = [
  "相邻对求和",
  "前缀峰值",
  "偶数拆分",
  "窗口得分",
  "去重计数",
  "数位折叠",
  "括号通道",
  "动态中位数",
  "资源队列",
  "山脉行走",
  "交通信号",
  "旋转轨迹",
  "最近更高者",
  "奇偶归并",
  "区间计数",
  "有序合并",
  "最短窗口计数",
  "惰性求和",
  "资源背包",
  "稳定分桶",
  "服务负载",
  "镜像单词",
  "预算路径",
  "分数提升",
  "班次报告",
  "字符预算",
  "路径接力",
  "颜色均值",
  "双端队列顺序",
  "最终账本",
];

const topics = [
  "数组",
  "前缀和",
  "数学",
  "滑动窗口",
  "哈希表",
  "模拟",
  "栈",
  "数据结构",
  "队列",
  "差分",
  "区间",
  "旋转",
  "单调栈",
  "排序",
  "数位统计",
  "双指针",
  "字符串",
  "统计",
  "动态规划",
  "分桶",
  "事件扫描",
  "字符串",
  "图论",
  "前缀最大值",
  "区间合并",
  "计数",
  "树",
  "数学",
  "双端队列",
  "综合",
];

const difficulties = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];

const problemMetas: ProblemMeta[] = Array.from({ length: 30 }).map((_, idx) => {
  const number = idx + 1;
  const slug = `P${String(number).padStart(4, "0")}`;
  return {
    problemNumber: number,
    slug,
    title: problemTitles[idx],
    topic: topics[idx],
    source: "题库精选",
    difficulty: difficulties[idx % difficulties.length],
    type: idx % 2 === 0 ? ProblemType.TRADITIONAL : ProblemType.FUNCTIONAL,
    acceptanceRate: Number((0.35 + (idx % 10) * 0.05).toFixed(2)),
  };
});

function statementFilePath(slug: string) {
  return path.join(process.cwd(), "prisma", "problem-statements", `${slug}.md`);
}

async function loadMarkdownStatement(slug: string) {
  const filePath = statementFilePath(slug);
  const markdown = await fs.readFile(filePath, "utf8");
  return markdown.trim();
}

async function loadProblemCaseMap() {
  const filePath = path.join(process.cwd(), "prisma", "problem-cases.json");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as ProblemCaseConfig[];
  return new Map(parsed.map((item) => [item.slug, item]));
}

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
    // 多个学生账号
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

function makeExamples(config: ProblemCaseConfig) {
  return [
    {
      input: config.sampleIn,
      output: config.sampleOut,
      explanation: config.sampleExp,
    },
  ];
}

function makeTestCases(config: ProblemCaseConfig) {
  return [
    {
      input: config.sampleIn,
      expectedOutput: config.sampleOut,
      isSample: true,
    },
    {
      input: config.hiddenIn,
      expectedOutput: config.hiddenOut,
      isSample: false,
    },
  ];
}

async function seedProblems() {
  const caseMap = await loadProblemCaseMap();

  await prisma.judgeResult.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.example.deleteMany();
  await prisma.problem.deleteMany();

  for (const item of problemMetas) {
    const caseConfig = caseMap.get(item.slug);
    if (!caseConfig) {
      throw new Error(`Missing problem case config for ${item.slug}`);
    }

    const statement = await loadMarkdownStatement(item.slug);
    const examples = makeExamples(caseConfig);
    const testCases = makeTestCases(caseConfig);

    await prisma.problem.create({
      data: {
        slug: item.slug,
        problemNumber: item.problemNumber,
        title: item.title,
        statement,
        topic: item.topic,
        source: item.source,
        difficulty: item.difficulty,
        type: item.type,
        acceptanceRate: item.acceptanceRate,
        functionName: item.type === ProblemType.FUNCTIONAL ? "solve" : null,
        functionSignature:
          item.type === ProblemType.FUNCTIONAL
            ? "function solve(input: string): string"
            : null,
        traditionalInputFormat:
          item.type === ProblemType.TRADITIONAL ? caseConfig.inFmt : null,
        traditionalOutputFormat:
          item.type === ProblemType.TRADITIONAL ? caseConfig.outFmt : null,
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
}

async function main() {
  await seedUsers();
  await seedProblems();
  await seedContests();
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
