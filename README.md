# AI 辅助编程教育平台

这是一个面向毕业设计的全栈原型，目标是把题库做题、提交评测、AI 在线辅导、学习分析、学习路径推荐和多角色管理整合到一个现代 Web + PWA 平台中。

## 现阶段内容

- Next.js App Router 骨架
- 多角色平台首页
- 学习总览、题库、题目详情、Agent、分析、论坛、后台页面
- Prisma + SQLite 数据库
- NextAuth 凭证鉴权
- 函数式题目（LeetCode 风格）与传统输入输出题（Codeforces 风格）分区展示
- Submission/TestCase/JudgeResult 评测数据链路
- Judge0 真提交 + 轮询结果
- 黑白极简主题 + 系统默认明暗切换

## 本地启动

1. 安装依赖

```bash
npm install
```

1. 初始化数据库并写入种子数据

```bash
npm run db:migrate -- --name init
npm run db:seed
```

1. 启动开发环境

```bash
npm run dev
```

## 演示账号

- `student@example.com` / `password123`
- `teacher@example.com` / `password123`
- `admin@example.com` / `password123`

## Judge0 配置

默认使用公开 CE 服务：

```env
JUDGE0_API_BASE_URL="https://ce.judge0.com"
```

如果你使用 RapidAPI 版 Judge0，可额外设置：

```env
JUDGE0_API_KEY="your-key"
JUDGE0_API_HOST="judge0-ce.p.rapidapi.com"
```

当前已支持语言：C++、C、Python、Go、Rust、Java。

## 下一步建议

1. 为函数式题增加“自动包装器”，让用户只提交函数而非完整程序。
2. 增加提交历史页和按用户/题目筛选。
3. 把 AI 辅导对话与提交历史、评测错误类型打通。
4. 增加教师端题库管理和学习统计图表。
# aI-coding-learning-platform
