# AI编程学习平台 (AIOJ)

[English](./README.en.md) | 中文

一个现代化的**在线编程学习平台**，集成了AI辅导、代码评测、竞赛管理、论坛讨论等功能，为编程学习者提供完整的学习生态。

## ✨ 核心特性

- 🤖 **AI智能辅导**：集成多个AI模型（Deepseek等），提供个性化学习建议和周度总结
- 💻 **完整代码评测系统**：支持6种编程语言（C、C++、Python、Go、Rust、Java），基于Judge0实现
- 📚 **智能题库**：分难度等级、支持自定义题单和学习路线
- 🏆 **多模式竞赛**：官方赛、团队赛、个人赛、回放赛，支持OI/ICPC/IOI多种格式
- 💬 **社区论坛**：四大讨论板块（网站、招聘、学术、题目）
- 📊 **数据分析**：详细的学习统计、提交分析、通过率统计
- 🎨 **现代化UI**：响应式设计、暗黑模式支持、流畅动画效果
- 📐 **数学公式支持**：使用KaTeX渲染数学公式
- 🔐 **完整权限系统**：学生、教师、管理员三层权限管理

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- SQLite 3.0+（可选，数据库已包含）

### 安装步骤

1. **克隆项目**

```bash
git clone https://github.com/yourusername/ai-coding-learning-platform.git
cd ai-coding-learning-platform
```

2. **安装依赖**

```bash
npm install
```

3. **配置环境变量**

```bash
cp .env.example .env.local
```

编辑 `.env.local` 并配置以下变量：

```env
# 数据库
DATABASE_URL="file:./prisma/dev.db"

# NextAuth认证
NEXTAUTH_SECRET="your-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# AI配置
AI_PROVIDER="deepseek"              # AI提供商
AI_MODEL="deepseek-chat"            # 默认模型
AI_API_KEY="your-api-key"           # AI API密钥

# Judge0代码评测API
JUDGE0_API_URL="https://judge0-api.com"
JUDGE0_API_AUTH_TOKEN="your-token"
```

4. **初始化数据库**

```bash
npm run db:generate   # 生成Prisma客户端
npm run db:migrate    # 执行数据库迁移
npm run db:seed       # 填充示例数据
```

5. **启动开发服务器**

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 即可看到应用。

## 📦 项目结构

```
ai-coding-learning-platform/
├── app/                          # Next.js应用目录
│   ├── api/                      # API路由
│   │   ├── ai/                   # AI辅导相关API
│   │   ├── auth/                 # 认证API
│   │   ├── contests/             # 竞赛管理API
│   │   ├── forum/                # 论坛API
│   │   ├── learn/                # 学习相关API
│   │   ├── learning-routes/      # 学习路线API
│   │   ├── statistics/           # 统计分析API
│   │   ├── submissions/          # 提交评测API
│   │   └── users/                # 用户管理API
│   ├── components/               # 页面级组件
│   ├── admin/                    # 管理员页面
│   ├── agent/                    # AI助手页面
│   ├── analytics/                # 分析统计页面
│   ├── contests/                 # 竞赛页面
│   ├── dashboard/                # 用户仪表板
│   ├── discussion/               # 讨论区页面
│   ├── forum/                    # 论坛页面
│   ├── learn/                    # 题库学习页面
│   ├── login/                    # 登录页面
│   ├── problems/                 # 题目详情页面
│   ├── register/                 # 注册页面
│   ├── statistics/               # 统计页面
│   ├── submissions/              # 提交记录页面
│   ├── submit/                   # 代码提交页面
│   └── users/                    # 用户中心页面
├── components/                   # 可复用组件库
│   ├── forum-board-select.tsx
│   ├── problem-browser.tsx
│   ├── submission-history.tsx
│   ├── theme-provider.tsx
│   └── ...
├── lib/                          # 工具函数和服务
│   ├── prisma.ts                 # Prisma客户端
│   ├── judge0.ts                 # Judge0集成
│   ├── contest-db.ts             # 竞赛数据库操作
│   ├── problems.ts               # 题目相关操作
│   └── ...
├── prisma/                       # 数据库配置
│   ├── schema.prisma             # 数据库模式定义
│   ├── seed.ts                   # 数据库种子
│   ├── migrations/               # 数据库迁移
│   └── problem-statements/       # 题目描述文件
├── types/                        # TypeScript类型定义
├── auth.ts                       # NextAuth配置
├── package.json                  # 项目依赖配置
├── tsconfig.json                 # TypeScript配置
├── tailwind.config.ts            # Tailwind CSS配置
└── next.config.mjs               # Next.js配置
```

## 🗄️ 数据库架构

### 核心模型

#### 用户系统

- **User**: 平台用户（支持三种角色：学生、教师、管理员）
  - 认证：邮箱和密码哈希存储
  - AI配置：支持自定义AI供应商和模型
  - 关联：提交记录、API密钥配置、论坛发帖、竞赛注册

#### 题目系统

- **Problem**: 编程题目
  - 类型：函数式题目和传统题目（ACM/IOI）
  - 难度：简单、普通、困难
  - 附带：示例、测试用例、相关信息
- **Example**: 题目示例代码
- **TestCase**: 题目测试用例

#### 提交与评测

- **Submission**: 用户提交的代码
  - 语言：C、C++、Python、Go、Rust、Java
  - 状态：已排队、运行中、通过、答案错误、编译错误等8种状态
- **JudgeResult**: Judge0返回的评测结果
  - 详细的运行信息：输出、错误信息、运行时间、内存占用

#### 竞赛系统

- **Contest**: 竞赛/比赛
  - 类型：官方赛、团队赛、个人赛、回放赛
  - 格式：OI、ICPC、IOI
  - 状态管理：未开始、进行中、已结束
- **ContestRegistration**: 用户竞赛注册

#### 社区系统

- **ForumPost**: 论坛主帖
- **ForumComment**: 论坛评论
- **Board**: 论坛四个讨论板块（网站、招聘、学术、题目）

#### AI辅导系统

- **AiTutoring**: AI辅导会话
- **AiConversation**: AI对话历史

#### 其他

- **ApiKeyConfig**: 用户API密钥管理
- **LearningRoute**: 学习路线
- **LearningRouteProgress**: 学习进度追踪

### ER图表

```
User → Submission → JudgeResult
↓      ↓
Problem ← TestCase, Example

User → AiTutoring → Problem
User → AiConversation

Contest ← ContestRegistration → User
Contest ← Problem

ForumPost ← ForumComment
ForumPost → User, Problem
ForumPost → ForumBoard

User → LearningRoute → LearningRouteProgress
```

## 🔌 API参考

### 认证端点

- `POST /api/auth/signin` - 用户登录
- `POST /api/auth/signup` - 用户注册
- `POST /api/auth/signout` - 用户登出
- `GET /api/auth/session` - 获取当前会话

### 题目端点

- `GET /api/learn/problems` - 获取题目列表
- `GET /api/learn/problems/[id]` - 获取题目详情
- `POST /api/learn/problems/[id]/submit` - 提交代码

### 竞赛端点

- `GET /api/contests` - 获取竞赛列表
- `GET /api/contests/[id]` - 获取竞赛详情
- `POST /api/contests/[id]/register` - 注册竞赛

### 提交端点

- `GET /api/submissions` - 获取提交记录列表
- `GET /api/submissions/[id]` - 获取提交详情

### AI辅导端点

- `POST /api/ai/tutoring` - 请求AI辅导
- `GET /api/ai/weekly-summary` - 获取周度总结
- `GET /api/ai/recommendations` - 获取学习建议

### 论坛端点

- `GET /api/forum/posts` - 获取论坛帖子
- `POST /api/forum/posts` - 发布帖子
- `POST /api/forum/comments` - 发布评论

## 🛠️ 可用命令

```bash
# 开发
npm run dev              # 启动开发服务器（端口3000）
npm run build            # 构建生产版本
npm start                # 启动生产服务器

# 代码质量
npm run lint             # 运行ESLint检查

# 数据库
npm run db:generate      # 生成Prisma客户端代码
npm run db:migrate       # 执行待处理的数据库迁移
npm run db:seed          # 用示例数据填充数据库

# 测试
npm run test:nav-indicator  # 测试导航栏指示器
```

## 📚 技术栈详解

### 前端

- **Next.js 15.1.0**: 现代React框架，支持SSR、SSG、API路由
- **React 19**: UI库
- **TypeScript**: 类型安全的JavaScript
- **TailwindCSS**: 实用优先的CSS框架
- **Framer Motion**: 现代动画库
- **Lucide React**: 美观的SVG图标库
- **next-themes**: 暗黑模式管理

### 后端

- **Next.js API Routes**: 轻量级后端
- **Prisma**: ORM数据库工具
- **SQLite**: 轻量级数据库

### 认证

- **NextAuth.js 5.0**: 完整的认证解决方案
- **bcryptjs**: 密码加密

### 代码评测

- **Judge0**: 在线代码编译和执行服务
- 支持语言：C、C++、Python、Go、Rust、Java

### 内容渲染

- **react-markdown**: Markdown渲染
- **remark-math**: Markdown数学公式支持
- **rehype-katex**: KaTeX公式渲染

### 数据验证

- **Zod**: TypeScript优先的数据验证库

## 🔐 认证与安全

### 认证流程

1. 用户通过邮箱和密码注册/登录
2. 密码使用bcryptjs进行哈希加密存储
3. NextAuth.js使用JWT策略管理会话
4. API请求通过session验证进行授权

### 权限系统

- **STUDENT**: 普通学生用户，可提交题目、参加竞赛、浏览论坛
- **TEACHER**: 教师用户，可创建题目、管理竞赛
- **ADMIN**: 管理员，拥有系统最高权限

## 🤖 AI集成

平台支持多个AI供应商的集成，提供智能学习支持：

### 功能

- **智能辅导**: 根据用户提交的代码提供优化建议
- **周度总结**: AI自动生成每周学习情况总结
- **学习建议**: 根据学习进度提供个性化学习路线建议
- **对话记录**: 保存AI对话历史供用户查阅

### 配置

用户可在设置中自定义：

- AI供应商（如Deepseek）
- AI模型选择
- 个人API密钥

## 📊 学习分析

平台提供详细的学习分析功能：

- 提交记录统计
- 题目通过率分析
- 难度分布展示
- 竞赛成绩追踪
- 学习进度可视化

## 🎨 UI/UX特点

- **现代设计**: 简洁、清晰的界面设计
- **暗黑模式**: 完整的深色主题支持
- **流畅动画**: 使用Framer Motion实现丝滑的页面过渡
- **响应式布局**: 完美适配桌面、平板、手机屏幕
- **数学公式**: 原生支持复杂数学公式渲染

## 🐛 已知问题与改进方向

详见 [plan.md](./plan.md) 中的后续功能规划。

## 📝 开发规范

### 代码风格

- 使用TypeScript开发，禁用`any`类型
- 遵循ESLint和Prettier规范
- 使用功能组件和React Hooks

### 文件命名

- React组件：PascalCase (e.g., `UserProfile.tsx`)
- 工具函数：camelCase (e.g., `getUserData.ts`)
- 页面路由：使用Next.js约定 (e.g., `app/problems/[id]/page.tsx`)

### 提交规范

- 使用有意义的commit信息
- 遵循常规提交格式 (feat:, fix:, docs:, etc.)

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目采用[MIT许可证](./LICENSE)。

## 📞 联系方式

- 📧 邮件: support@example.com
- 💬 论坛: [讨论区](#)
- 🐛 报告问题: [Issues](#)

## 🙏 致谢

- [Judge0](https://judge0.com/) - 代码评测API
- [Next.js](https://nextjs.org/) - React框架
- [Prisma](https://www.prisma.io/) - 数据库ORM
- [TailwindCSS](https://tailwindcss.com/) - CSS框架
- 所有贡献者和用户的支持

---

**最后更新**: 2026年5月13日

**版本**: 0.1.0（开发中）
