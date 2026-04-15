import bcrypt from "bcryptjs";
import { Difficulty, PrismaClient, ProblemType, Role } from "@prisma/client";

const prisma = new PrismaClient();

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

async function seedProblems() {
  const problems = [
    {
      slug: "two-sum-rebuild",
      title: "Two Sum Rebuild",
      statement:
        "给定整数数组 nums 和整数 target，返回任意两个下标，使得 nums[i] + nums[j] == target。",
      topic: "数组 / 哈希表",
      source: "基础训练",
      difficulty: Difficulty.EASY,
      type: ProblemType.FUNCTIONAL,
      acceptanceRate: 0.89,
      functionName: "twoSum",
      functionSignature:
        "function twoSum(nums: number[], target: number): number[]",
      examples: [
        {
          input: "nums = [2,7,11,15], target = 9",
          output: "[0,1]",
          explanation: "nums[0] + nums[1] = 9",
        },
        {
          input: "nums = [3,2,4], target = 6",
          output: "[1,2]",
          explanation: "nums[1] + nums[2] = 6",
        },
      ],
      testCases: [
        {
          input: "4 9\n2 7 11 15",
          expectedOutput: "0 1",
          isSample: true,
        },
        {
          input: "3 6\n3 2 4",
          expectedOutput: "1 2",
          isSample: true,
        },
      ],
    },
    {
      slug: "longest-substring-window",
      title: "Longest Substring Window",
      statement:
        "给定字符串 s，找到不含重复字符的最长子串长度，要求时间复杂度尽量优化。",
      topic: "滑动窗口",
      source: "核心路径",
      difficulty: Difficulty.MEDIUM,
      type: ProblemType.FUNCTIONAL,
      acceptanceRate: 0.63,
      functionName: "lengthOfLongestSubstring",
      functionSignature: "function lengthOfLongestSubstring(s: string): number",
      examples: [
        {
          input: 's = "abcabcbb"',
          output: "3",
          explanation: "最长子串是 abc",
        },
      ],
      testCases: [
        {
          input: "abcabcbb",
          expectedOutput: "3",
          isSample: true,
        },
        {
          input: "bbbbb",
          expectedOutput: "1",
          isSample: true,
        },
      ],
    },
    {
      slug: "watermelon",
      title: "Watermelon",
      statement:
        "给定一个整数 w，判断是否可以把它分成两个正偶数的和。输出 YES 或 NO。",
      topic: "实现",
      source: "CF 风格入门",
      difficulty: Difficulty.EASY,
      type: ProblemType.TRADITIONAL,
      acceptanceRate: 0.92,
      traditionalInputFormat: "一行一个整数 w (1 <= w <= 100)",
      traditionalOutputFormat: "若可拆分输出 YES，否则输出 NO",
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      examples: [
        {
          input: "8",
          output: "YES",
          explanation: "8 = 4 + 4",
        },
      ],
      testCases: [
        {
          input: "8",
          expectedOutput: "YES",
          isSample: true,
        },
        {
          input: "5",
          expectedOutput: "NO",
          isSample: true,
        },
      ],
    },
    {
      slug: "next-round",
      title: "Next Round",
      statement:
        "给定 n 名选手得分和名次线 k，统计晋级人数。分数为 0 的选手不能晋级。",
      topic: "数组",
      source: "CF 风格基础",
      difficulty: Difficulty.MEDIUM,
      type: ProblemType.TRADITIONAL,
      acceptanceRate: 0.75,
      traditionalInputFormat: "第一行两个整数 n k，第二行 n 个非负整数表示成绩",
      traditionalOutputFormat: "输出一个整数，表示晋级人数",
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      examples: [
        {
          input: "8 5\n10 9 8 7 7 7 5 5",
          output: "6",
          explanation: "前 6 名成绩至少为 7 且 > 0",
        },
      ],
      testCases: [
        {
          input: "8 5\n10 9 8 7 7 7 5 5",
          expectedOutput: "6",
          isSample: true,
        },
        {
          input: "4 2\n0 0 0 0",
          expectedOutput: "0",
          isSample: true,
        },
      ],
    },
  ];

  for (const item of problems) {
    const existing = await prisma.problem.findUnique({
      where: { slug: item.slug },
    });

    const baseData = {
      slug: item.slug,
      title: item.title,
      statement: item.statement,
      topic: item.topic,
      source: item.source,
      difficulty: item.difficulty,
      type: item.type,
      acceptanceRate: item.acceptanceRate,
      functionName: item.functionName,
      functionSignature: item.functionSignature,
      traditionalInputFormat: item.traditionalInputFormat,
      traditionalOutputFormat: item.traditionalOutputFormat,
      timeLimitMs: item.timeLimitMs,
      memoryLimitMb: item.memoryLimitMb,
    };

    if (existing) {
      await prisma.problem.update({
        where: { id: existing.id },
        data: baseData,
      });
      await prisma.example.deleteMany({ where: { problemId: existing.id } });
      await prisma.testCase.deleteMany({ where: { problemId: existing.id } });
      await prisma.example.createMany({
        data: item.examples.map((example, index) => ({
          problemId: existing.id,
          input: example.input,
          output: example.output,
          explanation: example.explanation,
          sortOrder: index,
        })),
      });
      await prisma.testCase.createMany({
        data: item.testCases.map((testCase, index) => ({
          problemId: existing.id,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          isSample: testCase.isSample,
          sortOrder: index,
          points: 1,
        })),
      });
      continue;
    }

    await prisma.problem.create({
      data: {
        ...baseData,
        examples: {
          create: item.examples.map((example, index) => ({
            input: example.input,
            output: example.output,
            explanation: example.explanation,
            sortOrder: index,
          })),
        },
        testCases: {
          create: item.testCases.map((testCase, index) => ({
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
