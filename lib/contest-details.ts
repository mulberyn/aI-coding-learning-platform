// 比赛详情数据
export interface ContestProblem {
  problemId: string;
  number: number;
  title: string;
  fullScore: number;
}

export interface ContestRankingEntry {
  rank: number;
  userId: string;
  username: string;
  totalScore: number;
  penalty: number; // ICPC赛制才有
  submissionDetails: {
    problemId: string;
    solved: boolean;
    attempts: number;
    time: number; // 分钟
  }[];
}

export interface ContestDetail {
  id: string;
  title: string;
  description: string;
  type: string; // OFFICIAL, TEAM_PUBLIC, INDIVIDUAL_PUBLIC, REPLAY
  format: string; // OI, ICPC, IOI
  status: string; // NOT_STARTED, IN_PROGRESS, ENDED
  startTime: Date;
  endTime: Date;
  duration: number; // 分钟
  participantCount: number;
  problems: ContestProblem[];
  announcement: string;
  ranking: ContestRankingEntry[];
}

// "数据结构基础赛" 的详细数据
export const getContestDetail = (id: string): ContestDetail | null => {
  if (id !== "5") return null; // 只有 id 为 5 的比赛有详细数据

  return {
    id: "5",
    title: "数据结构基础赛",
    description: "这是一场专注于数据结构基础知识的比赛",
    type: "OFFICIAL",
    format: "OI",
    status: "ENDED",
    startTime: new Date(Date.now() - 1209600000), // 14天前
    endTime: new Date(Date.now() - 1206000000),
    duration: 90,
    participantCount: 267,
    announcement: `**比赛公告**

欢迎参加数据结构基础赛！

**比赛说明：**
- 本场比赛共有5道题目，总分100分
- 采用OI赛制，根据通过的测试点数来计分
- 比赛期间可查看实时排名
- 禁止使用任何外部工具或资源，违反规定将被取消成绩

**重要提示：**
- 请在比赛开始前检查网络连接
- 建议在比赛结束前15分钟完成最后提交
- 如遇技术问题，请及时联系管理员

**时间安排：**
- 比赛时间：90分钟
- 提交截止时间：比赛结束时
- 成绩公布时间：比赛结束后立即公布`,
    problems: [
      {
        problemId: "p0018",
        number: 1,
        title: "栈的应用",
        fullScore: 20,
      },
      {
        problemId: "p0019",
        number: 2,
        title: "链表操作",
        fullScore: 20,
      },
      {
        problemId: "p0020",
        number: 3,
        title: "二叉树遍历",
        fullScore: 20,
      },
      {
        problemId: "p0021",
        number: 4,
        title: "图的基本算法",
        fullScore: 20,
      },
      {
        problemId: "p0022",
        number: 5,
        title: "动态规划基础",
        fullScore: 20,
      },
    ],
    ranking: [
      {
        rank: 1,
        userId: "user001",
        username: "algorithm_master",
        totalScore: 100,
        penalty: 0,
        submissionDetails: [
          {
            problemId: "p0018",
            solved: true,
            attempts: 1,
            time: 5,
          },
          {
            problemId: "p0019",
            solved: true,
            attempts: 2,
            time: 12,
          },
          {
            problemId: "p0020",
            solved: true,
            attempts: 1,
            time: 18,
          },
          {
            problemId: "p0021",
            solved: true,
            attempts: 3,
            time: 35,
          },
          {
            problemId: "p0022",
            solved: true,
            attempts: 1,
            time: 42,
          },
        ],
      },
      {
        rank: 2,
        userId: "user002",
        username: "data_struct_expert",
        totalScore: 100,
        penalty: 0,
        submissionDetails: [
          {
            problemId: "p0018",
            solved: true,
            attempts: 1,
            time: 8,
          },
          {
            problemId: "p0019",
            solved: true,
            attempts: 1,
            time: 14,
          },
          {
            problemId: "p0020",
            solved: true,
            attempts: 2,
            time: 25,
          },
          {
            problemId: "p0021",
            solved: true,
            attempts: 2,
            time: 38,
          },
          {
            problemId: "p0022",
            solved: true,
            attempts: 2,
            time: 48,
          },
        ],
      },
      {
        rank: 3,
        userId: "user003",
        username: "coding_enthusiast",
        totalScore: 80,
        penalty: 0,
        submissionDetails: [
          {
            problemId: "p0018",
            solved: true,
            attempts: 1,
            time: 6,
          },
          {
            problemId: "p0019",
            solved: true,
            attempts: 1,
            time: 16,
          },
          {
            problemId: "p0020",
            solved: true,
            attempts: 3,
            time: 28,
          },
          {
            problemId: "p0021",
            solved: false,
            attempts: 4,
            time: 45,
          },
          {
            problemId: "p0022",
            solved: true,
            attempts: 2,
            time: 52,
          },
        ],
      },
      {
        rank: 4,
        userId: "user004",
        username: "java_lover",
        totalScore: 80,
        penalty: 0,
        submissionDetails: [
          {
            problemId: "p0018",
            solved: true,
            attempts: 2,
            time: 10,
          },
          {
            problemId: "p0019",
            solved: true,
            attempts: 1,
            time: 18,
          },
          {
            problemId: "p0020",
            solved: false,
            attempts: 5,
            time: 50,
          },
          {
            problemId: "p0021",
            solved: true,
            attempts: 2,
            time: 32,
          },
          {
            problemId: "p0022",
            solved: true,
            attempts: 1,
            time: 40,
          },
        ],
      },
      {
        rank: 5,
        userId: "user005",
        username: "python_coder",
        totalScore: 60,
        penalty: 0,
        submissionDetails: [
          {
            problemId: "p0018",
            solved: true,
            attempts: 1,
            time: 7,
          },
          {
            problemId: "p0019",
            solved: false,
            attempts: 3,
            time: 40,
          },
          {
            problemId: "p0020",
            solved: true,
            attempts: 2,
            time: 22,
          },
          {
            problemId: "p0021",
            solved: false,
            attempts: 6,
            time: 60,
          },
          {
            problemId: "p0022",
            solved: true,
            attempts: 3,
            time: 55,
          },
        ],
      },
      {
        rank: 6,
        userId: "user006",
        username: "cpp_beginner",
        totalScore: 40,
        penalty: 0,
        submissionDetails: [
          {
            problemId: "p0018",
            solved: true,
            attempts: 1,
            time: 4,
          },
          {
            problemId: "p0019",
            solved: false,
            attempts: 2,
            time: 25,
          },
          {
            problemId: "p0020",
            solved: false,
            attempts: 4,
            time: 55,
          },
          {
            problemId: "p0021",
            solved: false,
            attempts: 3,
            time: 45,
          },
          {
            problemId: "p0022",
            solved: true,
            attempts: 2,
            time: 50,
          },
        ],
      },
      {
        rank: 7,
        userId: "user007",
        username: "competitive_prog",
        totalScore: 40,
        penalty: 0,
        submissionDetails: [
          {
            problemId: "p0018",
            solved: true,
            attempts: 2,
            time: 9,
          },
          {
            problemId: "p0019",
            solved: true,
            attempts: 1,
            time: 15,
          },
          {
            problemId: "p0020",
            solved: false,
            attempts: 5,
            time: 50,
          },
          {
            problemId: "p0021",
            solved: false,
            attempts: 4,
            time: 60,
          },
          {
            problemId: "p0022",
            solved: false,
            attempts: 3,
            time: 55,
          },
        ],
      },
      {
        rank: 8,
        userId: "user008",
        username: "learning_path",
        totalScore: 20,
        penalty: 0,
        submissionDetails: [
          {
            problemId: "p0018",
            solved: true,
            attempts: 1,
            time: 11,
          },
          {
            problemId: "p0019",
            solved: false,
            attempts: 2,
            time: 20,
          },
          {
            problemId: "p0020",
            solved: false,
            attempts: 3,
            time: 35,
          },
          {
            problemId: "p0021",
            solved: false,
            attempts: 2,
            time: 30,
          },
          {
            problemId: "p0022",
            solved: false,
            attempts: 1,
            time: 25,
          },
        ],
      },
      {
        rank: 9,
        userId: "user009",
        username: "newbie_coder",
        totalScore: 20,
        penalty: 0,
        submissionDetails: [
          {
            problemId: "p0018",
            solved: false,
            attempts: 3,
            time: 20,
          },
          {
            problemId: "p0019",
            solved: true,
            attempts: 1,
            time: 13,
          },
          {
            problemId: "p0020",
            solved: false,
            attempts: 2,
            time: 28,
          },
          {
            problemId: "p0021",
            solved: false,
            attempts: 1,
            time: 15,
          },
          {
            problemId: "p0022",
            solved: false,
            attempts: 2,
            time: 35,
          },
        ],
      },
      {
        rank: 10,
        userId: "user010",
        username: "dream_coder",
        totalScore: 0,
        penalty: 0,
        submissionDetails: [
          {
            problemId: "p0018",
            solved: false,
            attempts: 2,
            time: 15,
          },
          {
            problemId: "p0019",
            solved: false,
            attempts: 1,
            time: 10,
          },
          {
            problemId: "p0020",
            solved: false,
            attempts: 1,
            time: 12,
          },
          {
            problemId: "p0021",
            solved: false,
            attempts: 1,
            time: 8,
          },
          {
            problemId: "p0022",
            solved: false,
            attempts: 1,
            time: 5,
          },
        ],
      },
    ],
  };
};

// 获取所有比赛（用于列表页）
export const getAllContests = () => {
  const now = Date.now();
  return [
    {
      id: "1",
      title: "周赛 #1 - 数组与哈希表",
      type: "OFFICIAL",
      format: "OI",
      status: "NOT_STARTED",
      startTime: new Date(now + 86400000),
      endTime: new Date(now + 90000000),
      duration: 60,
      participantCount: 0,
    },
    {
      id: "2",
      title: "2024年秋季班级排位赛",
      type: "TEAM_PUBLIC",
      format: "ICPC",
      status: "IN_PROGRESS",
      startTime: new Date(now - 3600000),
      endTime: new Date(now + 21600000),
      duration: 120,
      participantCount: 45,
    },
    {
      id: "3",
      title: "算法进阶挑战赛",
      type: "INDIVIDUAL_PUBLIC",
      format: "IOI",
      status: "NOT_STARTED",
      startTime: new Date(now + 172800000),
      endTime: new Date(now + 259200000),
      duration: 180,
      participantCount: 0,
    },
    {
      id: "4",
      title: "Codeforces Round 123 重现赛",
      type: "REPLAY",
      format: "ICPC",
      status: "ENDED",
      startTime: new Date(now - 604800000),
      endTime: new Date(now - 600000000),
      duration: 120,
      participantCount: 128,
    },
    {
      id: "5",
      title: "数据结构基础赛",
      type: "OFFICIAL",
      format: "OI",
      status: "ENDED",
      startTime: new Date(now - 1209600000),
      endTime: new Date(now - 1206000000),
      duration: 90,
      participantCount: 267,
    },
  ];
};
