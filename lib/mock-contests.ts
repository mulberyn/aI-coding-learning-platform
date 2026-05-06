// 模拟比赛数据
export const mockContests = [
  {
    id: "1",
    title: "周赛 #1 - 数组与哈希表",
    type: "OFFICIAL",
    format: "OI",
    status: "NOT_STARTED",
    startTime: new Date(Date.now() + 86400000), // 明天
    endTime: new Date(Date.now() + 90000000),
    duration: 60,
    participantCount: 0,
  },
  {
    id: "2",
    title: "2024年秋季班级排位赛",
    type: "TEAM_PUBLIC",
    format: "ICPC",
    status: "IN_PROGRESS",
    startTime: new Date(Date.now() - 3600000), // 1小时前
    endTime: new Date(Date.now() + 21600000), // 6小时后
    duration: 120,
    participantCount: 45,
  },
  {
    id: "3",
    title: "算法进阶挑战赛",
    type: "INDIVIDUAL_PUBLIC",
    format: "IOI",
    status: "NOT_STARTED",
    startTime: new Date(Date.now() + 172800000), // 2天后
    endTime: new Date(Date.now() + 259200000), // 3天后
    duration: 180,
    participantCount: 0,
  },
  {
    id: "4",
    title: "Codeforces Round 123 重现赛",
    type: "REPLAY",
    format: "ICPC",
    status: "ENDED",
    startTime: new Date(Date.now() - 604800000), // 7天前
    endTime: new Date(Date.now() - 600000000), // 7天前结束
    duration: 120,
    participantCount: 128,
  },
  {
    id: "5",
    title: "数据结构基础赛",
    type: "OFFICIAL",
    format: "OI",
    status: "ENDED",
    startTime: new Date(Date.now() - 1209600000), // 14天前
    endTime: new Date(Date.now() - 1206000000),
    duration: 90,
    participantCount: 267,
  },
  {
    id: "6",
    title: "图论深度解析赛",
    type: "OFFICIAL",
    format: "IOI",
    status: "NOT_STARTED",
    startTime: new Date(Date.now() + 345600000), // 4天后
    endTime: new Date(Date.now() + 349200000),
    duration: 120,
    participantCount: 0,
  },
  {
    id: "7",
    title: "动态规划优化赛",
    type: "INDIVIDUAL_PUBLIC",
    format: "OI",
    status: "IN_PROGRESS",
    startTime: new Date(Date.now() - 7200000), // 2小时前
    endTime: new Date(Date.now() + 14400000), // 4小时后
    duration: 180,
    participantCount: 89,
  },
  {
    id: "8",
    title: "字符串算法专项赛",
    type: "TEAM_PUBLIC",
    format: "ICPC",
    status: "NOT_STARTED",
    startTime: new Date(Date.now() + 432000000), // 5天后
    endTime: new Date(Date.now() + 435600000),
    duration: 120,
    participantCount: 0,
  },
  {
    id: "9",
    title: "几何计算竞赛",
    type: "OFFICIAL",
    format: "OI",
    status: "ENDED",
    startTime: new Date(Date.now() - 2592000000), // 30天前
    endTime: new Date(Date.now() - 2588400000),
    duration: 120,
    participantCount: 456,
  },
  {
    id: "10",
    title: "并查集与二分查找",
    type: "INDIVIDUAL_PUBLIC",
    format: "OI",
    status: "IN_PROGRESS",
    startTime: new Date(Date.now() - 1800000), // 30分钟前
    endTime: new Date(Date.now() + 18000000), // 5小时后
    duration: 120,
    participantCount: 76,
  },
  {
    id: "11",
    title: "AtCoder Heuristic Contest 009 重现赛",
    type: "REPLAY",
    format: "OI",
    status: "NOT_STARTED",
    startTime: new Date(Date.now() + 518400000), // 6天后
    endTime: new Date(Date.now() + 522000000),
    duration: 240,
    participantCount: 0,
  },
  {
    id: "12",
    title: "矩阵乘法与线性代数",
    type: "OFFICIAL",
    format: "IOI",
    status: "ENDED",
    startTime: new Date(Date.now() - 3888000000), // 45天前
    endTime: new Date(Date.now() - 3884400000),
    duration: 150,
    participantCount: 345,
  },
];
