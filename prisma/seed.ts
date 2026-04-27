import bcrypt from "bcryptjs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Difficulty, PrismaClient, ProblemType, Role } from "@prisma/client";

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

async function main() {
  await seedUsers();
  await seedProblems();
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
