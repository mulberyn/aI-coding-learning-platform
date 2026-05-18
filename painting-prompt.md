以下给出 5 张图的 next-ai-drawio 提示词（每段为独立提示），按功能细分并包含详细说明，便于逐张绘制，避免单图过于拥挤。所有图均建议使用 Crow’s Foot 基数符号、主键/外键标注、逻辑外键用虚线，并在侧边列出枚举说明（不要把枚举画成表）。

【图A：用户与鉴权、API Key 管理与会话】（聚焦账号与认证配置）
目标：展示账号生命周期和与第三方 AI 配置的关系，适合用于展示权限与配置管理部分的数据库结构。
实体与字段（仅列关键字段）：

- `User`：`id (PK)`, `email (UNIQUE)`, `name`, `role (Role enum)`, `passwordHash`, `createdAt`, `updatedAt`。
- `ApiKeyConfig`：`id (PK)`, `userId (FK -> User.id)`, `provider`, `name`, `model`, `apiKey`, `isActive`, `createdAt`, `updatedAt`。约束：`(userId, provider, name)` 唯一。
- `AiConversation`（运行时表）：`id (PK)`, `userId (FK -> User.id)`, `title`, `messages (JSON)`, `createdAt`, `updatedAt`。
  关系要点：
- `User 1:N ApiKeyConfig`（显示 FK 在 ApiKeyConfig 上，标注唯一约束）；
- `User 1:N AiConversation`（AiConversation 标注为运行时动态建表；messages 为 JSON 文本）；

绘图说明：在实体旁用注释列出 `Role` 枚举值（STUDENT/TEACHER/ADMIN），用 Crow’s Foot 表示 1:N。把 ApiKeyConfig 的 `isActive` 结合注释说明“启用一条配置时其他配置置为非激活”。保持图面简洁，只展示账号与配置相关联的字段与约束。

【图B：AI 辅导与提交链接（评测上下文）】（聚焦 AI 辅导与提交的直接关联）
目标：详细展示 AI 辅导如何与提交、题目与用户关联，便于说明 AI 辅导的触发条件与存储结构。
实体与字段：

- `Submission`：`id (PK)`, `userId (FK -> User.id)`, `problemId (FK -> Problem.id)`, `language`, `sourceCode`, `status (SubmissionStatus enum)`, `score`, `message`, `createdAt`, `updatedAt`。
- `AiTutoring`：`id (PK)`, `userId (FK -> User.id)`, `submissionId (FK -> Submission.id)`, `problemId (FK -> Problem.id)`, `tutoringType`, `tutoringContent (Markdown)`, `createdAt`, `updatedAt`。约束：`(submissionId, tutoringType)` 唯一。
- `Problem`（精简）：`id (PK)`, `slug (UNIQUE)`, `title`, `difficulty (enum)`, `type (enum)`, `createdAt`, `updatedAt`。
  关系要点：
- `Submission 1:N AiTutoring`（Submission 可有多条辅导记录）；
- `User 1:N Submission`、`User 1:N AiTutoring`；
- `Problem 1:N Submission`、`Problem 1:N AiTutoring`。

绘图说明：在 AiTutoring 上标注“辅导类型示例：code_analysis、improvement_suggestion、error_analysis”。把 `(submissionId, tutoringType)` 唯一约束画在 AiTutoring 实体中。侧边注明 SubmissionStatus 和 TutorType 的常见取值，使用虚线或注释说明 AI 调用依赖的用户 API Key 选择逻辑。

【图C：题库、示例与测试用例、提交评测链路】（聚焦题目与评测）
目标：呈现题库核心实体与评测闭环，突出 TestCase、JudgeResult 与 Submission 的一对多关系，适合说明评测数据流与统计入口。
实体与字段：

- `Problem`（完整）：`id (PK)`, `problemNumber`, `slug (UNIQUE)`, `title`, `statement`, `topic`, `difficulty (enum)`, `type (enum)`, `timeLimitMs`, `memoryLimitMb`, `createdAt`, `updatedAt`。
- `Example`：`id (PK)`, `problemId (FK -> Problem.id)`, `input`, `output`, `explanation`, `sortOrder`。
- `TestCase`：`id (PK)`, `problemId (FK -> Problem.id)`, `input`, `expectedOutput`, `isSample (boolean)`, `sortOrder`, `points`, `createdAt`, `updatedAt`。
- `Submission`：同上。
- `JudgeResult`：`id (PK)`, `submissionId (FK -> Submission.id)`, `testCaseId (FK -> TestCase.id)`, `status (JudgeResultStatus enum)`, `stdout`, `stderr`, `compileOutput`, `timeSec`, `memoryKb`, `createdAt`, `updatedAt`。约束：`(submissionId, testCaseId)` 唯一。
  关系要点：
- `Problem 1:N Example`、`Problem 1:N TestCase`、`Problem 1:N Submission`；
- `Submission 1:N JudgeResult`、`TestCase 1:N JudgeResult`；

绘图说明：将 JudgeResult 的状态枚举（PENDING/PASSED/FAILED/ERROR）放在侧边作为注释。在 Submission 到 JudgeResult 的连线上标注“每个提交按 TestCase 逐点生成 JudgeResult 记录”。强调整体链路如何为统计模块提供原始数据（通过率、平均运行时间等）。

【图D：竞赛（Contest）与排行榜、报名关系】（聚焦竞赛数据模型）
目标：清晰展示竞赛相关实体与其与题目的桥接关系，便于说明赛题编排、排名与报名的数据库设计。
实体与字段：
Contest & Leaderboard, Registration Relationship

- `Contest`：`id (PK)`, `title`, `description`, `type (ContestType enum)`, `format (ContestFormat enum)`, `status (ContestStatus enum)`, `startTime`, `endTime`, `duration`, `participantCount`, `announcement`, `createdAt`, `updatedAt`。
- `ContestProblem`（桥接表）：`id (PK)`, `contestId (FK -> Contest.id)`, `problemId (logical FK -> Problem.id)`, `number`, `fullScore`, `createdAt`。约束：`(contestId, number)` 唯一。
- `ContestRegistration`：`id (PK)`, `contestId (FK -> Contest.id)`, `userId (FK -> User.id)`, `createdAt`。约束：`(contestId, userId)` 唯一。
- `ContestRanking`：`id (PK)`, `contestId (FK -> Contest.id)`, `rank`, `userId`, `username`, `totalScore`, `penalty`, `details (JSON)`, `createdAt`。约束：`(contestId, rank)` 唯一；`userId` 可用虚线指向 `User`（逻辑关联）。
  关系要点：
- `Contest 1:N ContestProblem`、`Contest 1:N ContestRegistration`、`Contest 1:N ContestRanking`；
- `ContestProblem` 与 `Problem` 为逻辑连线（表明题目被引用到比赛中）。

绘图说明：在 ContestProblem 上用注释标明“problemId 为逻辑外键，代码中以引用 ID 形式存在”。把 ContestFormat/ContestType/ContestStatus 的枚举值放在侧注。用 Crow’s Foot 明确展示报名与排名的基数。

【图E：论坛、评论与学习路线】（聚焦社区与学习路线的运行时表）
目标：展示社区互动与个性化学习路线的存储结构，强调运行时建表与引用关系。
实体与字段：
Forums, Comments & Learning Paths

- `ForumPost`：`id (PK)`, `title`, `content`, `isPinned`, `board (ForumBoard enum)`, `userId (FK -> User.id)`, `problemId (nullable FK -> Problem.id)`, `createdAt`, `updatedAt`。
- `ForumComment`：`id (PK)`, `content`, `postId (FK -> ForumPost.id)`, `userId (FK -> User.id)`, `createdAt`, `updatedAt`。
- `learning_routes`（运行时表）：`id (PK)`, `user_id (FK -> User.id)`, `name`, `source (manual|ai)`, `input_prompt`, `summary`, `generated_at`, `created_at`, `updated_at`。
- `learning_route_points`（运行时表）：`id (PK)`, `route_id (FK -> learning_routes.id)`, `title`, `description`, `point_type (problem|contest|forum|custom)`, `ref_id`, `target_date`, `status (pending|in_progress|done)`, `sort_order`。
  关系要点：
- `ForumPost 1:N ForumComment`；
- `User 1:N ForumPost`、`User 1:N ForumComment`；
- `learning_routes 1:N learning_route_points`（运行时创建，需在图中以不同色或注记标明）。

绘图说明：把 `ForumPost.problemId` 标注为可空（nullable），并说明“题目版发帖须关联题目 ID，否则置空”。在 learning_routes 与 learning_route_points 实体旁注释索引（如按 user_id、created_at 排序）和运行时创建逻辑。侧边列出 `ForumBoard`、学习点 `point_type`、以及学习点 `status` 的取值说明。

通用要求（适用于五张图）：

- 使用 Crow’s Foot 基数表示法；主键与唯一约束在实体内明确标注；外键在实体中用 `FK ->` 标注，并在连线上明确基数；逻辑外键使用虚线连线并加注“逻辑关联”；运行时动态建表的表（`AiConversation`、`learning_routes`、`learning_route_points`）在实体名旁标注“runtime-created”；枚举统一在每张图侧边列出；输出风格应当整洁、专业，便于论文或毕设中使用的图片输出（SVG/PNG）。

---

每张图的文字描述（约200字/段，可作为图注或毕设正文）：

图A（用户与鉴权、API Key 管理与会话）：
该图聚焦平台的账号与鉴权设计，展示 `User` 与 `ApiKeyConfig` 的关系以及运行时创建的 `AiConversation` 会话表。`User` 实体强调邮箱唯一性与 `role` 枚举（STUDENT/TEACHER/ADMIN），`ApiKeyConfig` 除了保存外部模型与密钥外，还包含 `isActive` 字段用于指示当前生效配置；系统通过唯一约束 `(userId,provider,name)` 管理多配置命名空间。`AiConversation` 标注为 runtime-created，用来持久化用户的多轮对话(JSON 格式)，并支持按 `userId` 查询与分页。图注建议说明 API Key 选择优先级（启用配置优先，缺省回退策略）、会话数据的隔离原则与最小权限访问策略，以便在论文中论述平台的安全边界、配置管理与审计能力。

图B（AI 辅导与提交链接）：
本图描述 `Submission` 与 `AiTutoring` 的关联，呈现从用户代码提交到 AI 辅导生成、持久化与去重的完整流程。`Submission` 记录语言、源码、评测状态与分数；`AiTutoring` 通过 `submissionId` 链接提交，并保存 `tutoringType` 与 Markdown 格式的辅导结果，系统对 `(submissionId,tutoringType)` 设唯一约束以避免重复生成同类辅导。图中同时展现 `User` 和 `Problem` 的引用关系，并以注释形式说明 AI 调用时应优先使用用户的激活 `ApiKeyConfig`，无配置时采用系统或默认模型。此图便于在毕设中解释 AI 辅导的业务规则、持久化语义、去重策略与与评测数据的耦合点，便于评估辅导效果与可追溯性。

图C（题库、示例与测试用例、评测链路）：
该图呈现题库与判题闭环，重点在 `Problem`、`TestCase`、`Submission` 与 `JudgeResult` 之间的数据流。`TestCase` 用于定义判题样例与评分权重，`Submission` 在评测时会对每个 `TestCase` 产出独立的 `JudgeResult` 条目，后者包含状态、输出、时间与内存等指标（`(submissionId,testCaseId)` 唯一）。图注建议强调评测通常为异步任务：提交→入队→执行→更新结果→汇总，且这些细粒度判题记录是统计与题目难度评估的基础数据。此图适合在论文中说明评测系统的可观测性设计、性能度量字段与如何通过聚合得到通过率、平均耗时与资源分布等指标。

图D（竞赛、排行榜与报名关系）：
本图围绕竞赛的建模需求，展示 `Contest`、桥接的 `ContestProblem`、`ContestRegistration` 与 `ContestRanking` 的存储方案。`ContestProblem` 将题目以序号插入赛事并记录满分，采用 `(contestId,number)` 唯一约束保证题目次序；报名表以 `(contestId,userId)` 唯一避免重复报名；排行榜记录以 `details` 字段保存每位参赛者的提交明细与计分构成，`userId` 可视为逻辑外键指向 `User`。图注应当说明报名/退赛的状态约束（例如仅在赛前允许报名取消）、并发更新时的事务处理建议，以及如何从 `ContestRanking.details` 中重建个体提交历史，便于在论文中讨论竞赛一致性、计分规则与重放分析策略。

图E（论坛、评论与学习路线）：
该图展示社区互动与个性化学习路线的存储模型，包含 `ForumPost`、`ForumComment` 与运行时表 `learning_routes`/`learning_route_points`。`ForumPost.problemId` 被设计为可空以支持通用讨论帖与题目版发帖，删除题目时采取置空策略保留讨论语境；学习路线采用主表 + 点子表结构，学习点支持引用题目/比赛/帖子（`ref_id`），并记录 `target_date` 与 `status` 以追踪进度。图注建议标明运行时建表逻辑、对 `user_id` 的索引策略以优化按用户查询的性能，以及如何将 AI 生成的路线建议与用户手动调整结合，形成闭环的个性化学习体验，这部分内容适合作为毕设中用户体验与系统设计的案例分析。
