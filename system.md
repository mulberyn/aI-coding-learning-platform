# 第X章 系统实现

本章围绕 AI 编程学习平台的工程落地过程，系统阐述关键功能的实现方法与技术细节。实现层面以 Next.js 全栈架构为基础，结合 Prisma 与 SQLite 完成数据持久化，通过 NextAuth 建立身份认证与权限控制，并接入 Judge0 与大模型服务实现在线评测和智能辅导能力。在具体内容上，本章将依次介绍系统总体架构、用户与权限、题库与评测、AI 对话与学习路线、竞赛与论坛以及统计分析等模块，重点说明核心数据流、接口设计、异常处理与可扩展性策略，为后续系统测试与效果评估提供实现依据。

## X.1 系统总体实现架构

### X.1.1 前后端一体化实现模式

本系统采用 Next.js 15 的 App Router 作为统一开发框架，将页面渲染、路由控制与接口服务组织在同一工程内完成，形成“页面即入口、API 即服务”的一体化实现模式。前端页面主要分布于 app 目录下的各功能子路由中，例如首页、题库、提交记录、比赛、论坛、学习与个人中心等页面；后端接口则通过 app/api 下的 route.ts 统一暴露，直接完成数据查询、提交处理与外部服务调用。该模式减少了传统前后端分离架构中接口联调和跨域配置的负担，也使页面与接口之间能够共享类型定义、工具函数和认证上下文。系统在顶层布局中统一加载 SessionProvider、ThemeProvider 以及悬浮式 AI 助手组件，使所有页面具备一致的登录态、主题状态和交互入口。对于题目详情、提交详情、学习路线等需要高频联动的页面，页面层可直接调用数据库查询逻辑或从 API 取得结构化数据，从而降低状态同步复杂度，提高开发迭代效率与整体可维护性。整体上，该实现方式兼顾了教学型系统对快速交付的要求，也为后续扩展教师端、管理员端和更多智能化能力预留了统一的工程入口。

### X.1.2 核心数据流

Core Data Flow Diagram
系统的核心数据流围绕“请求进入、鉴权校验、业务处理、持久化写入、结果返回”五个阶段展开，所有关键接口都遵循统一的处理顺序。用户在前端触发操作后，请求首先进入对应 API 路由，接口先通过 auth() 判断会话是否存在，再依据具体场景执行身份归属验证或角色权限判断，避免未登录用户或越权用户访问敏感资源。随后系统使用 zod 对请求体进行结构化校验，确保题号、语言、标题、内容等字段满足最小长度和枚举约束，减少脏数据进入业务层。校验通过后，接口进入数据库读写阶段：例如提交接口会写入 Submission 并预创建 JudgeResult，论坛发帖会创建 ForumPost 和关联题目，学习路线接口会读写 learning_routes 与 learning_route_points。对于需要外部调用的流程，如判题、AI 对话和学习路线生成，则在业务层拼装上下文并请求 Judge0 或大模型服务，再将返回内容整理为统一的数据结构。整个链路在每一步均设置异常捕获，前端可获得明确的状态码与错误提示，而非直接暴露底层异常。该数据流设计保证了系统在功能逐步扩展时仍能维持一致的处理范式，也便于后续针对判题超时、模型异常和数据库冲突进行局部优化。

### X.1.3 外部能力集成

系统外部能力主要集成了两类服务：Judge0 代码评测服务和大模型推理服务。Judge0 用于完成多语言代码编译、运行与测试点判定，系统通过 lib/judge0.ts 封装语言 ID 映射、提交接口、轮询接口以及状态归一化逻辑，使上层无需直接关心第三方服务返回格式。在网络不稳定或服务短暂不可用时，代码还实现了针对 503、504、429 等状态的重试与退避策略，尽可能保证评测链路稳定。大模型能力则统一服务于 AI 对话、代码辅导、名称生成和学习路线推荐等场景，系统在 /api/ai/chat、/api/learn/tutoring、/api/learning-routes/recommend 与 /api/ai/generate-name 等接口中复用同一套 Deepseek 与 Qwen 兼容调用逻辑。调用前会优先读取用户激活的 API 配置，如果存在已启用的 ApiKeyConfig，则以该配置为准，否则回退到用户主配置。这样既支持用户按需切换模型供应商，也保证不同功能调用在同一套鉴权与参数管理策略下运行。外部服务的统一接入方式，使系统能够在不改变核心业务结构的前提下持续扩展智能学习能力，并保持接口风格的一致性。

### X.1.4 全局能力注入

系统在根布局中完成了全局能力注入，核心做法是在 app/layout.tsx 内统一包裹 SessionProvider 与 ThemeProvider，并在 body 末尾挂载 AIAssistantWidget，使登录态、主题样式和 AI 助手在整站范围内可复用。SessionProvider 负责将 next-auth 的会话状态传递到客户端组件，便于顶部导航、个人菜单和权限相关页面实时感知登录状态；ThemeProvider 则依托 next-themes 完成浅色、深色与系统主题三态切换，并将主题选择持久化到浏览器环境中。AI 助手以悬浮按钮形式常驻页面右下角，支持选中文本注入、预设问题、消息发送和公式渲染，用户无需离开当前页面即可获得帮助。为了提升页面统一性，导航栏、主要内容区和数据表格均使用相同的边框、阴影和圆角语言，避免页面之间的视觉割裂。对于题目详情、提交详情、论坛和学习概览等页面，系统通过全局挂载的能力入口将“浏览—学习—提问—再学习”的行为串联起来，使交互路径更加连续。该层级的统一注入不仅减少重复代码，也让后续新增页面能够直接继承平台的基础交互能力。

## X.2 用户与权限系统实现

### X.2.1 认证流程实现

本系统的认证流程采用 NextAuth 的 Credentials 方案实现，整体逻辑围绕“账号校验、密码比对、会话签发”三个步骤展开。用户在登录页输入邮箱和密码后，请求首先进入服务端的认证回调，系统使用 zod 对基础字段进行格式校验，确保邮箱符合规范、密码长度满足要求，再根据邮箱从数据库中查询用户记录。若用户不存在，系统直接返回空结果；若用户存在，则通过 bcryptjs 将明文密码与数据库中的 passwordHash 进行比对，只有比对成功才允许建立登录态。这种方式避免了前端暴露敏感逻辑，也保证了身份校验完全在服务端完成。登录成功后，系统不再依赖传统 Session 表，而是采用 JWT 作为会话载体，将 userId、role 等关键信息写入 token 中，使后续页面和接口能够快速识别当前用户身份。由于平台同时存在学生、教师和管理员三类角色，因此该认证流程不仅解决“是否登录”的问题，还为后续访问控制、提交详情可见性、个人数据保护等场景提供了统一基础。与此同时，认证入口通过 pages.signIn 映射到 /login，保证未登录用户在访问受限页面时能够自然跳转到登录界面，形成完整的认证闭环。整体来看，该实现兼顾了教学项目对开发效率的要求与工程实践中的安全边界，是系统权限体系的第一道防线。

核心代码如下：

```ts
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: "/api/auth",
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      authorize: async (rawCredentials) => {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) return null;

        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
```

### X.2.2 会话扩展与角色识别

在完成基础登录认证后，系统进一步通过 JWT 回调扩展会话信息，使“身份识别”和“角色识别”能够直接沿着请求链路传播。具体而言，在 jwt 回调中，只有当用户首次登录时才将 user.id 和 user.role 写入 token；随后在 session 回调中再把 token 中的 userId 与 role 注入 session.user，使前端组件和服务端接口都能通过同一份会话对象获取当前用户的唯一标识及角色类型。这样的设计避免了页面反复读取数据库，也减少了频繁请求用户表带来的性能开销。对于本项目而言，userId 是所有业务数据归属的核心字段，Submission、ForumPost、ContestRegistration、AiConversation、AiTutoring 等记录都以 userId 作为关联主键，因此只要会话对象可用，绝大多数接口都可以直接完成资源归属判断。role 字段则承担权限分级职责，系统将其划分为 STUDENT、TEACHER、ADMIN 三类：学生主要访问题库、提交、学习与论坛模块；教师和管理员则额外拥有查看提交详情、访问他人数据以及管理内容的权限。借助这种“JWT 扩展 + 统一会话读取”的方式，平台在前端导航、个人中心、提交详情和学习概览等页面中都能自然感知登录态与权限状态，从而让路由控制和业务约束保持一致，不需要在每个页面重复实现身份判断逻辑。

核心代码如下：

```ts
callbacks: {
	jwt: async ({ token, user }) => {
		if (user) {
			token.userId = user.id;
			token.role = user.role;
		}
		return token;
	},
	session: async ({ session, token }) => {
		if (session.user) {
			session.user.id = token.userId as string;
			session.user.role = token.role as "STUDENT" | "TEACHER" | "ADMIN";
		}
		return session;
	},
},
```

### X.2.3 权限控制策略

平台的权限控制采用“接口鉴权优先、资源归属校验其次、角色兜底放行”的策略。所有涉及用户数据读写的接口在进入业务逻辑前都会先调用 auth()，如果会话为空，则直接返回 401，避免匿名请求继续向下穿透。对于存在明确归属关系的资源，如提交详情、AI 辅导记录、学习路线、对话历史等，系统还会进一步比对资源所属 userId 与当前会话中的 userId，只有资源所有者才能执行查询、删除或更新操作。以提交详情接口为例，系统在读取 Submission 后，会检查该提交是否属于当前用户；若不是，则仅当当前角色为 TEACHER 或 ADMIN 时才允许访问，否则返回 403。这样的策略既符合教学平台对个人数据保护的要求，也满足教师端批量查看教学数据的需要。对于论坛发帖、评论、竞赛报名等操作，系统同样要求登录后才能执行，并通过 zod 和数据库约束防止非法参数进入持久层。值得注意的是，平台没有简单地把权限逻辑全部塞入前端，而是把它落实在 API 层和业务层中，因此即使前端页面出现绕过，后端也能保持稳定的安全边界。此外，系统对一些需要双向约束的接口还采用更严格的判断，例如比赛报名仅允许未开始的比赛参与，学习路线更新仅允许修改自己创建的路线，论坛题目版帖子则必须绑定真实题号。这类规则共同构成了平台的细粒度权限体系，使系统在保持灵活性的同时，具备较强的一致性和可审计性。

核心代码如下：

```ts
const submission = await prisma.submission.findUnique({
  where: { id },
  include: {
    user: { select: { id: true } },
    problem: { select: { slug: true, title: true } },
  },
});

const isOwner = submission.user.id === session.user.id;
const canViewAny =
  session.user.role === "ADMIN" || session.user.role === "TEACHER";

if (!isOwner && !canViewAny) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### X.2.4 用户级 LLM 配置管理

本系统的 AI 能力并不固定绑定单一模型，而是为每位用户提供独立的大模型配置管理能力。用户可以在个人设置中维护多组 ApiKeyConfig，分别记录 provider、name、model、apiKey 与 isActive 状态，以适应 Deepseek、Qwen 等不同供应商的兼容接入。实现上，系统在接口层提供新增、查询、切换激活状态与删除四类操作：新增接口负责创建新的配置记录，并通过联合唯一约束避免同一用户重复创建同名同供应商配置；查询接口按 userId 拉取当前用户的所有配置，用于前端列表展示；启用接口在将目标配置设为激活之前，先批量将该用户的其他配置全部置为非激活状态，从而保证系统始终只有一个生效配置；删除接口则先校验配置归属，再执行删除，避免越权操作。这样的设计使 AI 功能具备较高的灵活性：用户既可以在个人中心中切换主力模型，也可以为不同场景准备不同的 API Key，而提交辅导、对话、名称生成和学习路线推荐等接口都统一从“激活配置优先、主配置兜底”的规则读取参数。换言之，模型选择权被下放给用户，而系统则通过一致的读取策略保证调用行为稳定可控。这种配置管理方式既符合开源或教学平台中多模型并存的现实需求，也为后续扩展更多模型供应商、加入预算控制或调用统计提供了自然入口。

## X.3 题库与题目详情模块实现

### X.3.1 数据建模

题库与题目详情模块的数据建模围绕 Problem、Example、TestCase 三类核心实体展开，目标是同时满足题目展示、提交评测和学习分析三类需求。题目主表 Problem 负责描述题目的基本身份信息，包括题号、唯一标识 slug、标题、题面内容、所属知识主题、来源、难度、题型以及通过率等属性；其中题号用于面向用户展示，slug 作为路由与接口查询的稳定键，避免标题变更带来的链接失效。Example 用于保存样例输入、样例输出和解释说明，支持多组样例按顺序展示，便于前端在题面中直接渲染“输入—输出—说明”的标准结构。TestCase 则承担评测层面的测试数据管理，记录测试点输入、期望输出、是否为样例、分值权重以及排序信息，并与 JudgeResult 建立一对多关系，便于每次提交在各测试点上的执行结果回写到数据库中。这样的结构设计，使题库模块不是简单的题目文本集合，而是兼顾展示层、评测层与统计层的一体化数据模型。为了适应函数式题与传统输入输出题两种不同题型，Problem 中还分别配置 functionName、functionSignature、traditionalInputFormat 与 traditionalOutputFormat 等字段：函数式题可直接在详情页展示函数签名，传统题则展示输入输出格式说明。与此同时，timeLimitMs 与 memoryLimitMb 为判题过程和题目详情页提供统一的性能边界信息。整体而言，这一数据模型将“题目内容、样例、测试点、评测结果”明确分层，既保证了题库页面的可读性，也为后续统计题目通过率、分析用户做题行为提供了可计算的数据基础。

核心代码如下：

```prisma
model Problem {
  id                      String       @id @default(cuid())
  problemNumber           Int?
  slug                    String       @unique
  title                   String
  statement               String
  topic                   String
  source                  String
  difficulty              Difficulty
  type                    ProblemType
  acceptanceRate          Float?
  functionName            String?
  functionSignature       String?
  traditionalInputFormat  String?
  traditionalOutputFormat String?
  timeLimitMs             Int?
  memoryLimitMb           Int?
  examples                Example[]
  testCases               TestCase[]
  submissions             Submission[]
}
```

### X.3.2 题库列表实现

题库列表的实现并不是单纯地将题目逐条平铺，而是通过“题目组织 + 用户状态映射 + 统计信息补充”的方式构建更适合学习场景的浏览体验。系统在 lib/problems.ts 中提供 getPartitionedProblems 和 getProblemCatalog 两类查询方法：前者按题型将题目划分为函数式题和传统题，便于页面在侧边栏中快速切换；后者则一次性返回题目的完整目录信息，并在返回前为每道题补充真实的过题人数、尝试人数和通过率。这里的“真实”并不是依赖题目表中的静态缓存字段，而是基于 Submission 表按题目维度进行 groupBy 聚合后动态计算得到，因此即使新增提交或新用户参与，题库列表中的统计信息也能保持同步更新。前端在列表展示时，会结合登录态进一步调用 getUserProblemAttemptMap，将当前用户对每道题的做题状态映射为 UNTRIED、ATTEMPTED、SOLVED 三种状态，并将其渲染成不同的标识样式。这样一来，题库不仅展示题号、题名、难度、通过率，还能够直接反馈用户的学习进度，让“浏览题目”与“记录进度”自然结合。再结合页面中的搜索框、标签过滤、题单切换和收藏入口，系统把原本偏静态的 OJ 题库转化为更强调个人学习轨迹的动态页面。值得说明的是，题库列表中的排序规则也体现了教学场景的需求：题目首先按类型分组，再按难度排序，最后按创建时间排序，使低门槛题目和基础题型优先暴露给用户，降低入门压力。整体实现体现了“数据驱动展示、展示反哺学习”的设计思想。

核心代码如下：

```ts
export async function getProblemCatalog() {
  const problems = await prisma.problem.findMany({
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      statement: true,
      topic: true,
      source: true,
      difficulty: true,
      type: true,
      acceptanceRate: true,
      _count: { select: { submissions: true } },
    },
  });

  const catalogWithStats = await Promise.all(
    problems.map(async (problem) => {
      const acceptedSubmissions = await prisma.submission.groupBy({
        by: ["userId"],
        where: { problemId: problem.id, status: SubmissionStatus.ACCEPTED },
      });
      const solvedCount = acceptedSubmissions.length;

      const allAttempts = await prisma.submission.groupBy({
        by: ["userId"],
        where: { problemId: problem.id },
      });
      const attemptCount = allAttempts.length;

      return {
        ...problem,
        solvedCount,
        attemptCount,
      };
    }),
  );

  return catalogWithStats;
}
```

### X.3.3 动态统计口径

题库统计口径的实现是本模块的重要特点之一。为了避免把题目通过率写死在数据库里导致的失真问题，系统始终以 Submission 为唯一统计依据动态计算指标。在具体实现中，系统会先按题目筛选出所有提交记录，再分别统计“成功提交的唯一用户数”和“所有尝试该题的唯一用户数”，最后用二者的比值计算通过率。之所以采用“唯一用户数”而不是“提交次数”作为统计基准，是因为教学平台更关注“多少学生真正解决了这道题”，而不是“共提交了多少次”。这种口径能更准确地反映题目的学习难度，也能防止同一个用户多次提交对统计结果造成偏差。对于题目详情页来说，动态统计还承担着另外一个作用：页面顶部展示的提交人数、通过率、时间限制、空间限制等信息能够与题库列表保持一致，从而保证前后端展示逻辑统一。另一方面，统计方法与后续的个人学习分析也形成了联动。系统在个人中心和学习概览中需要计算某段时间内的完成题目数、知识点覆盖度和薄弱模块数量，而这些信息同样来源于 Submission 的聚合结果。也就是说，题库模块中的动态统计并不是孤立功能，而是整个学习画像体系的数据入口。通过这种实时聚合的方式，平台可以较好地适应题目新增、用户增长和提交频繁变化等场景，避免由于静态缓存导致的统计滞后和数据不一致问题，保证系统面向学习过程的反馈具有持续有效性。

核心代码如下：

```ts
const acceptedSubmissions = await prisma.submission.groupBy({
  by: ["userId"],
  where: {
    problemId: problem.id,
    status: SubmissionStatus.ACCEPTED,
  },
});
const solvedCount = acceptedSubmissions.length;

const allAttempts = await prisma.submission.groupBy({
  by: ["userId"],
  where: {
    problemId: problem.id,
  },
});
const attemptCount = allAttempts.length;

const acceptanceRate =
  attemptCount > 0
    ? Math.round((solvedCount / attemptCount) * 10000) / 10000
    : 0;
```

### X.3.4 题目详情页实现

题目详情页在实现上承担着“内容阅读、代码提交、统计查看与进一步学习”四种功能，因此其结构设计必须兼顾信息密度和交互连贯性。系统首先对题面 statement 进行分段解析：通过识别题面中“题目描述、输入格式、输出格式、数据范围”等二级标题，把一段长文本拆解为多个语义明确的区域，再结合题型决定是否显示输入输出说明或函数签名。这样做的好处是，后端只需要维护统一的题面文本格式，前端就能根据结构化解析结果呈现出更清晰的版式，而不必为不同题型分别维护页面模板。页面主体上方展示题号、标题、提交人数、通过率、时间限制和空间限制，右侧保留收藏、提交、统计和学习等操作入口，使用户能够在查看题目的同时直接进入后续任务。样例部分采用独立边框区域，并配合复制按钮，便于用户快速拿到输入输出内容进行本地调试；对于函数式题，则在详情页单独展示函数签名，帮助用户明确函数接口要求。右侧侧边栏则根据当前题目的类型和编号提供题目标签、相关题目推荐、提交入口和讨论入口等扩展信息，形成从“读题”到“提交”再到“复盘”的连续链路。该页面并未采用过度复杂的卡片式嵌套，而是通过分割线、间距和轻量边框来组织内容，从视觉上保持了题目阅读的专注度，也符合 OJ 场景下高频使用、快速定位信息的特点。整体上，题目详情页不仅是题目展示界面，更是平台连接提交评测与学习分析的重要枢纽。

核心代码如下：

```ts
function parseStatementSections(statement: string): StatementSections {
  const cleaned = statement.replace(/\r\n?/g, "\n").trim();
  const getSection = (name: string) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?:^|\\n)##\\s*${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
      "m",
    );
    const matched = cleaned.match(regex);
    return matched?.[1]?.trim() || null;
  };

  return {
    description: getSection("题目描述") || cleaned,
    inputFormat: getSection("输入格式"),
    outputFormat: getSection("输出格式"),
    dataRange: getSection("数据范围"),
  };
}

const displayDataRange =
  statementSections.dataRange ||
  `时间限制: ${problem.timeLimitMs ? `${problem.timeLimitMs} ms` : "1s"}\n空间限制: ${problem.memoryLimitMb ? `${problem.memoryLimitMb} MB` : "256MB"}`;
```

## X.4 在线评测系统实现

### X.4.1 提交链路

在线评测系统的提交链路是整个平台最核心的业务路径之一，其设计目标并不是单纯地“接收代码并返回结果”，而是要把用户登录态、题目数据、测试点数据、异步评测任务与后续学习反馈连接成一条完整的闭环。系统在 /api/submissions/route.ts 中实现了提交入口，用户在前端提交代码后，请求首先进入 POST 接口，接口会调用 auth() 检查当前会话是否存在，如果没有登录则立即返回 401，避免匿名用户直接触发评测任务。接下来，系统用 zod 对请求体进行严格校验，确保 problemSlug、language 和 sourceCode 三个字段都存在且符合最基本的结构要求，其中 language 使用 SubmissionLanguage 枚举约束，从而保证前端不会向后端传入非法语言值。校验通过后，系统会先到数据库中确认当前会话中的用户确实存在，这一步看似重复，但在实际实现中很重要，因为会话存在并不代表数据库中的用户记录仍然有效，尤其在演示系统或多环境切换场景下更容易出现孤儿会话。随后接口根据题目 slug 查询 Problem，并将该题目的 testCases 一并载入；如果题目不存在，接口直接返回 404，如果题目没有配置测试点，则返回 400，避免后续评测流程在空测试集上运行。通过这些前置校验后，系统才会创建 Submission 记录，并利用 judgeResults: { create: ... } 一次性为每个测试点生成占位记录。这种“先生成提交，再生成测试结果占位”的方式，有两个直接收益：一是保证每次提交都有完整可追踪的评测记录结构，二是使前端在提交详情页里即使尚未完成评测，也能看到状态为待评测的记录框架。最后，接口通过 void runSubmissionJudging(submission.id) 异步触发评测，提交接口本身并不阻塞等待判题完成，而是立即返回 submissionId 与初始状态，让前端可以通过轮询或页面刷新继续查看结果。这个提交链路的实现方式，体现了平台对“低等待、可追踪、可恢复”的设计要求，也为后续教学场景中的高并发提交提供了基础。

核心代码如下：

```ts
const createSubmissionSchema = z.object({
  problemSlug: z.string().min(1),
  language: z.nativeEnum(SubmissionLanguage),
  sourceCode: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission payload" },
      { status: 400 },
    );
  }

  const problem = await prisma.problem.findUnique({
    where: { slug: parsed.data.problemSlug },
    include: {
      testCases: { orderBy: { sortOrder: "asc" } },
    },
  });

  const submission = await prisma.submission.create({
    data: {
      userId: session.user.id,
      problemId: problem.id,
      language: parsed.data.language,
      sourceCode: parsed.data.sourceCode,
      judgeResults: {
        create: problem.testCases.map((testCase) => ({
          testCaseId: testCase.id,
        })),
      },
    },
  });

  void runSubmissionJudging(submission.id);
}
```

### X.4.2 异步评测流程

异步评测流程是在线评测系统真正体现工程能力的部分。该流程由 lib/judge0.ts 中的 runSubmissionJudging 函数统一驱动，核心思想是将一次提交拆解为“提交 Judge0、轮询任务状态、回写每个测试点结果、汇总最终提交状态”四个阶段，并在整个过程中维持明确的状态迁移。系统在收到 Submission.id 后，会先重新从数据库中读取该提交，并把题目及其 testCases 一并加载出来，这样可以确保评测时使用的是当前最新的测试数据，而不是前端提交时缓存的内容。若该题目没有测试点，系统会把提交状态直接置为 JUDGE_ERROR，并在 message 中提示“当前题目没有配置评测用例”，这说明系统在业务层已经为异常题目准备了独立的失败路径，而不是让后续判题任务空跑。进入正式评测后，提交状态首先被更新为 RUNNING，同时写入 startedAt 与“正在评测中...”提示，前端在此时就能明确看到任务已进入执行阶段。随后系统针对题目中的每一个测试点依次执行 submitToJudge0，再执行 pollJudge0，直到该测试点得到终态结果。这里没有采用一次性并发打满的方式，而是按测试点顺序逐个处理，这样虽然吞吐量不是极端最高，但实现更简单，日志更清晰，且更适合教学系统中调试和问题定位。每完成一个测试点，系统都会调用 prisma.judgeResult.updateMany 写回该测试点对应的状态、Judge0 token、标准输出、标准错误、编译输出、运行时间和内存占用。等全部测试点结束后，再通过 aggregateSubmissionStatus 汇总各测试点业务状态并写回 Submission，最终状态可能是 ACCEPTED、WRONG_ANSWER、COMPILE_ERROR、RUNTIME_ERROR、TIME_LIMIT_EXCEEDED 或 JUDGE_ERROR。这个流程的关键并不是“调用了外部服务”，而是“把外部服务的不确定性封装成平台内部可控的任务状态”，从而让前端、统计模块和学习分析模块都能够基于统一状态进行后续处理。

核心代码如下：

```ts
export async function runSubmissionJudging(submissionId: string) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      problem: {
        include: {
          testCases: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      status: SubmissionStatus.RUNNING,
      startedAt: new Date(),
      message: "正在评测中...",
    },
  });

  for (const testCase of submission.problem.testCases) {
    const token = await submitToJudge0(
      submission.language,
      submission.sourceCode,
      testCase.input,
      testCase.expectedOutput,
    );

    const judge0Result = await pollJudge0(token);
    const normalized = normalizeOutcome(judge0Result.status?.id ?? 0);
    await prisma.judgeResult.updateMany({
      where: { submissionId: submission.id, testCaseId: testCase.id },
      data: { status: normalized.judgeResultStatus },
    });
  }
}
```

### X.4.3 多语言与状态归一化

多语言映射与状态归一化是判题系统中最容易被忽视、却又最影响平台可用性的部分。平台面向的是在线编程学习场景，因此从一开始就要求支持 C、C++、Python、Go、Rust 和 Java 六种语言，这意味着系统必须把前端语言选择与 Judge0 的 language_id 建立稳定映射。为此，lib/judge0.ts 中定义了 judge0LanguageIdMap，用 SubmissionLanguage 作为键、Judge0 language_id 作为值，在提交时直接取出对应编号写入请求体。这样做可以把“语言选择”这一业务概念与“第三方服务的内部编号”解耦，未来若需要扩展更多语言，只需在映射表中补充即可，而不会破坏提交链路。与此同时，Judge0 返回的状态码并不直接适合平台展示。Judge0 的返回状态面向的是执行引擎内部语义，而平台更需要的是适合学习者理解的业务状态，因此系统又定义了 normalizeOutcome，将状态码 3 归类为通过，4 归类为答案错误，5 归类为超时，6 归类为编译错误，7 到 12 归类为运行错误，其余状态则归类为评测错误。这个归一化过程非常重要，因为前端提交列表、提交详情页、统计页面以及后续 AI 辅导模块都依赖统一状态名称进行展示或分析。举例来说，提交列表中“通过、答案错误、编译错误、运行错误、超时、评测错误”的颜色与图标，就是在这套归一化逻辑基础上实现的；AI 辅导模块在生成错误分析提示词时，也会根据归一化后的状态来决定要不要强调编译过程、运行过程或边界超时问题。因此，多语言映射解决了“如何把用户代码送给 Judge0”，状态归一化解决了“如何把 Judge0 的结果翻译回平台语言”，二者共同构成了在线评测系统可理解、可扩展、可维护的基础层。

核心代码如下：

```ts
const judge0LanguageIdMap: Record<SubmissionLanguage, number> = {
  C: 50,
  CPP: 54,
  PYTHON: 71,
  GO: 60,
  RUST: 73,
  JAVA: 62,
};

function normalizeOutcome(statusId: number): NormalizedCaseOutcome {
  if (statusId === 3) {
    return {
      judgeResultStatus: JudgeResultStatus.PASSED,
      submissionStatus: SubmissionStatus.ACCEPTED,
    };
  }
  if (statusId === 4) {
    return {
      judgeResultStatus: JudgeResultStatus.FAILED,
      submissionStatus: SubmissionStatus.WRONG_ANSWER,
    };
  }
  if (statusId === 5) {
    return {
      judgeResultStatus: JudgeResultStatus.ERROR,
      submissionStatus: SubmissionStatus.TIME_LIMIT_EXCEEDED,
    };
  }
  if (statusId === 6) {
    return {
      judgeResultStatus: JudgeResultStatus.ERROR,
      submissionStatus: SubmissionStatus.COMPILE_ERROR,
    };
  }
  return {
    judgeResultStatus: JudgeResultStatus.ERROR,
    submissionStatus: SubmissionStatus.RUNTIME_ERROR,
  };
}
```

### X.4.4 容错与稳定性设计

容错与稳定性设计是本系统在线评测模块能够在真实网络环境中持续工作的关键。Judge0 作为外部服务，不可避免会遇到短时拥塞、网络抖动或限流等问题，如果系统不做任何防护，用户在高峰期提交代码时就可能频繁遇到失败。为解决这一问题，submitToJudge0 和 pollJudge0 两个函数都加入了针对 503、504、429 等状态码的重试与退避机制。提交阶段设置 maxRetries 为 8 次，当接口返回临时不可用状态时，系统不会立刻终止，而是根据尝试次数逐步增加等待时间，从 1 秒增长到最多 5 秒，以降低对服务端的持续压力；轮询阶段则设置了 maxAttempts 为 180 次，结合逐步增长的 intervalMs，把单个提交的等待窗口控制在约 3 分钟范围内，避免某个异常任务长期占用系统资源。对于非临时错误，系统会立即抛出异常并进入统一的失败分支，避免无意义重复请求。与此同时，runSubmissionJudging 在捕获异常后会根据错误文本进一步分类：如果是临时不可用，则提示“评测服务暂时不可用，请稍后重新提交”；如果是轮询超时，则提示“评测超时，请稍后重新提交”；如果是提交失败，则提示“代码提交失败，请检查网络连接后重试”。这种错误分类不会改变业务结果，但能显著提升用户对系统状态的感知准确性。最终，所有无法恢复的异常都会把提交状态写回 JUDGE_ERROR，并更新 finishedAt，让前端明确知道该次提交已经结束。由此可见，系统的容错并不是简单地“捕获错误”，而是把第三方服务的不稳定性转换为可解释、可恢复、可重试的平台行为，从而保证教学场景下的连续性。

核心代码如下：

```ts
if (
  response.status === 504 ||
  response.status === 503 ||
  response.status === 429
) {
  lastError = new Error(`Judge0 temporarily unavailable (${response.status})`);
  let backoffMs = 1000;
  if (attempt > 0) {
    backoffMs = Math.min(1000 + attempt * 1000, 5000);
  }
  await sleep(backoffMs);
  continue;
}

const maxAttempts = 180;
let intervalMs = 1000;
for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
  // polling...
  await sleep(intervalMs);
  intervalMs = Math.min(intervalMs * 1.2, 5000);
}
```

### X.4.5 结果聚合与可追溯

结果聚合与可追溯能力决定了判题系统能否真正服务学习过程。在线评测系统的目标并不是只告诉用户“对”或“错”，而是要让用户知道哪里通过、哪里失败、失败原因是什么以及每个测试点的运行表现如何。因此，系统在每个测试点执行完成后，都会把 stdout、stderr、compileOutput、timeSec 和 memoryKb 等信息写入 JudgeResult 表，并且将 Judge0 的状态码与平台内部状态一一对应起来。等全部测试点结束后，runSubmissionJudging 会调用 aggregateSubmissionStatus 对收集到的 SubmissionStatus 数组进行整体归并：如果全部通过，则提交状态为 ACCEPTED；如果存在编译错误，则最终状态优先记为 COMPILE_ERROR；如果存在超时或运行错误，也会按照预定义优先级返回对应状态。与此同时，系统还会根据通过的测试点数量与总测试点数量计算得分，采用 Math.round((passedCount / totalCases) \* 100) 的方式得到百分制成绩，这使得部分通过的题目也能得到更细粒度的反馈。提交完成后，Submission 记录会更新 finishedAt 与 message，message 中会区分“通过所有测试用例”和“评测完成，未通过全部测试用例”，便于前端列表快速显示简明结论。更重要的是，提交详情页面会把 Submission 与 judgeResults 一起返回，前端因此可以逐个展示测试点的状态、运行时间和内存消耗，方便用户定位是算法错误、边界问题还是性能问题。对于教学系统而言，这种可追溯性非常关键，因为学习者往往需要通过测试点差异来定位问题。换言之，评测结果不仅是终局判断，更是后续 AI 辅导与自我修正的输入。系统把每次评测都保存为结构化记录，实际上就在为后续的学习分析、错误复盘和智能辅导提供数据基础，这也是本模块工程价值最高的部分。

核心代码如下：

```ts
const caseStatuses: SubmissionStatus[] = [];
let passedCount = 0;

for (const testCase of submission.problem.testCases) {
  const token = await submitToJudge0(
    submission.language,
    submission.sourceCode,
    testCase.input,
    testCase.expectedOutput,
  );

  const judge0Result = await pollJudge0(token);
  const statusId = judge0Result.status?.id ?? 0;
  const normalized = normalizeOutcome(statusId);
  caseStatuses.push(normalized.submissionStatus);

  if (normalized.judgeResultStatus === JudgeResultStatus.PASSED) {
    passedCount += 1;
  }

  await prisma.judgeResult.updateMany({
    where: {
      submissionId: submission.id,
      testCaseId: testCase.id,
    },
    data: {
      judge0Token: token,
      judge0StatusId: statusId,
      status: normalized.judgeResultStatus,
      stdout: judge0Result.stdout ?? null,
      stderr: judge0Result.stderr ?? null,
      compileOutput: judge0Result.compile_output ?? null,
      timeSec: judge0Result.time ? Number(judge0Result.time) : null,
      memoryKb: judge0Result.memory ?? null,
    },
  });
}

const finalStatus = aggregateSubmissionStatus(caseStatuses);
const score = Math.round(
  (passedCount / submission.problem.testCases.length) * 100,
);
```

## X.5 AI 智能辅导与对话系统实现

### X.5.1 统一模型调用层

AI 智能辅导与对话系统的底层并不是围绕某一个固定模型编写，而是采用统一调用层对 Deepseek 与 Qwen 两类兼容接口进行封装，使上层业务只关心“发送什么消息”和“返回什么内容”，而不必关心第三方 API 的具体差异。系统在 /api/ai/chat、/api/learn/tutoring 和 /api/ai/generate-name 等接口中复用了同一套 provider 选择、模型名称读取和 API Key 获取逻辑：首先根据当前登录用户的激活配置读取 ApiKeyConfig，如果存在已启用配置，则优先使用该配置中的 provider、model 和 apiKey；否则回退到用户在个人资料中保存的主配置 aiProvider、aiModel 与 aiApiKey。这样的设计使得同一个用户能够在多个大模型之间灵活切换，而不会影响前端页面的调用方式。统一调用层的另一项关键作用是消息结构标准化。系统将所有请求都整理为 ChatMessage 数组，消息仅保留 role 与 content 两个核心字段，并在请求前追加统一的 system prompt，用于约束模型的回答风格、语言风格和输出格式。比如对话模块要求模型用简洁、自然、专业的中文回答，优先结合用户提供的上下文、题目与学习目标，并支持 Markdown 与数学公式输出；学习辅导模块则会根据不同 tutoringType 构造更具教学导向的提示词。通过这种方式，系统将模型调用抽象成一个稳定的“请求—响应”通道，上层功能可以通过改变 prompt 内容来适配不同场景，而无需重新编写网络请求逻辑。统一调用层还体现出两个工程上的优势：一是减少重复代码，让对话、命名、辅导、推荐等功能共享同一套错误处理路径；二是便于未来扩展更多国产模型或 OpenAI Compatible 接口，只需增加 provider 分支即可。对于一个教学型平台而言，这种设计比直接绑定单一模型更符合真实使用场景，也更容易持续演进。

核心代码如下：

```ts
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
      temperature: 0.45,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`${provider} chat request failed with ${response.status}`);
  }
}

const selectedConfig = user.apiKeyConfigs[0];
const provider = (
  selectedConfig?.provider ??
  user.aiProvider ??
  "deepseek"
).toLowerCase();
const model = selectedConfig?.model ?? user.aiModel ?? "deepseek-chat";
const apiKey = selectedConfig?.apiKey ?? user.aiApiKey;
```

### X.5.2 学习辅导场景实现

学习辅导场景是 AI 能力在平台中的核心落点之一，其实现不是简单地把用户提交的代码丢给模型，而是围绕“题目、提交、状态、错误信息”四类上下文构造有教学针对性的提示词。系统在 /api/learn/tutoring/route.ts 中接受 submissionId 和 tutoringType 两个参数，其中 tutoringType 被限定为三种类型：code_analysis、improvement_suggestion 和 error_analysis。三种类型分别对应代码分析、改进建议和错误分析，覆盖了大多数在线评测学习者最常见的辅导需求。接口首先通过 auth() 判断是否登录，然后验证 submissionId 与 tutoringType 是否同时存在；随后根据 submissionId 回表查询 Submission，同时载入 problem 与 user，以便 prompt 中能够准确拼接题目标题、代码内容、提交状态和分数信息。为了避免同一次提交、同一种辅导类型被重复生成，系统在创建 AI 辅导之前还会先查询 aiTutoring 表，利用 submissionId_tutoringType 的联合唯一约束判断是否已经存在同类型记录，如果存在则直接返回现有结果，从而避免重复调用模型并节省成本。真正生成 prompt 时，系统会先构造 codeContext，把代码包裹在三引号代码块中，并结合不同 tutoringType 生成不同的教学目标：code_analysis 强调逻辑分析、潜在问题与代码质量；improvement_suggestion 强调性能优化、代码风格、算法优化和边界处理；error_analysis 则更关注错误原因、修复方法和预防措施。随后系统将这个 prompt 与统一的 systemPrompt 组合成消息数组发送给模型。模型回复后，内容会作为 tutoringContent 持久化到 aiTutoring 表中，同时更新用户的 aiTutoringCount，以支持后续学习概览统计。这种实现方式让 AI 辅导不再是单纯的聊天，而是与提交结果强绑定的“问题诊断—建议输出—记录留存”闭环，有利于学生在每一次提交后迅速理解错误并形成持续迭代的学习路径。

核心代码如下：

```ts
const submission = await prisma.submission.findUnique({
  where: { id: submissionId },
  include: {
    problem: true,
    user: true,
  },
});

const existingTutoring = await prisma.aiTutoring.findUnique({
  where: {
    submissionId_tutoringType: {
      submissionId,
      tutoringType,
    },
  },
});

const codeContext = `\`\`\`${submission.language.toLowerCase()}\n${submission.sourceCode}\n\`\`\``;

if (tutoringType === "code_analysis") {
  prompt = `请分析以下提交的代码。题目是《${submission.problem?.title}》。\n\n${codeContext}\n\n提交状态：${submission.status}\n分数：${submission.score}\n\n请提供详细的代码分析，包括：\n1. 代码逻辑分析\n2. 可能存在的问题\n3. 代码质量评估`;
}
```

### X.5.3 会话能力实现

会话能力实现是本系统 AI 助手从“临时问答”升级为“可持续学习助手”的关键。仅有实时聊天并不足以支撑教学过程中的复盘、回看与逐步积累，因此平台单独设计了 AIConversation 持久化机制，用于保存用户的每一段对话历史。该机制由两个层面组成：一是后端会话存储接口，二是前端 AI 助手组件中的保存与命名流程。后端部分在 /api/ai/conversations/route.ts 中通过原始 SQL 创建 AiConversation 表，并为 userId 与 createdAt 建立索引，使用户可按时间顺序快速检索历史对话。GET 接口按 userId 查询当前用户的对话列表，并将 messages 字段从 JSON 字符串解析为数组返回；POST 接口则负责保存或更新会话，逻辑上先根据传入 id 尝试 UPDATE，如果没有更新到任何行，再执行 INSERT。这种“先更新、后插入”的写法使同一个会话既可作为新会话创建，也可作为已有会话续写，符合聊天场景中反复保存和继续对话的使用习惯。为了保证消息结构稳定，系统还定义了 normalizeMessage：它只接受 role、content、promptText 和 attachments 等字段，并把 attachments 中的选择内容和预设内容统一规范化为可持久化对象，既保留了用户在 AI 助手中的划词上下文，也保留了预设 skill 的来源信息。前端组件 AIAssistantWidget 在此基础上进一步完成交互层封装：用户打开保存对话窗口后，可输入标题，也可通过标题生成接口自动获取一个简短名称，再点击保存完成持久化。消息序列在保存前会通过 serializeConversationMessages 统一编码，从而把 role、content、promptText 和附件都一起送到后端。这样一来，对话不再只是屏幕上的临时内容，而成为可以检索、继续、删除和复盘的学习资产。对于 AI 辅导、对话训练和学习分析而言，这种会话持久化能力是平台沉淀学习过程的重要基础。

核心代码如下：

```ts
async function ensureConversationTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS AiConversation (
      id TEXT NOT NULL PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      messages TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = String(body?.id ?? randomUUID());
  const title = String(body?.title ?? "未命名对话");
  const messages = Array.isArray(body?.messages)
    ? body.messages.map(normalizeMessage).filter(Boolean)
    : [];

  const updateResult = await prisma.$executeRaw(
    Prisma.sql`
      UPDATE AiConversation
      SET title = ${title}, messages = ${serializedMessages}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ${id} AND userId = ${userId}
    `,
  );

  if (!updateResult) {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO AiConversation (id, userId, title, messages, createdAt, updatedAt)
        VALUES (${id}, ${userId}, ${title}, ${serializedMessages}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
    );
  }
}
```

### X.5.4 学习计数机制

学习计数机制的设计目标，是把 AI 使用行为量化成可统计、可展示、可分析的学习指标。平台并不把 AI 辅导视为一次普通的接口调用，而是把它看作学习行为的一部分，因此每当用户成功触发一次辅导并获得有效回复后，系统都会为该用户的 aiTutoringCount 自增 1。这个计数并不是前端自行累加，而是在 /api/learn/tutoring/route.ts 中于辅导记录创建成功之后由服务端统一更新，这样可以避免前端刷新、网络失败或重复提交导致的统计失真。具体实现上，系统在创建 aiTutoring 记录后，紧接着执行 prisma.user.update，并使用 increment 原子操作对 aiTutoringCount 加一。使用原子自增而不是先读后写，能够避免并发请求下的覆盖问题，尤其是在同一用户快速多次点击“AI 辅导”按钮时更能保持准确性。这个计数会被学习概览、个人中心和首页学习分析等多个区域共同使用，例如在仪表盘中展示本周 AI 辅导轮次、在个人中心中展示累计辅导次数、在学习薄弱点建议中作为行为特征的一部分输入给模型。也就是说，aiTutoringCount 不只是一个数字，它代表用户与平台智能能力交互的频率，是“自主学习—模型反馈—再次学习”闭环中的重要行为维度。通过这种机制，平台能够把大模型调用从一次性响应转化为可持续积累的数据资产，为后续构建更细粒度的学习画像、推荐系统和教学评价提供量化依据。

核心代码如下：

```ts
const tutoring = await prisma.aiTutoring.create({
  data: {
    userId,
    submissionId,
    problemId: submission.problemId,
    tutoringType,
    tutoringContent,
  },
});

await prisma.user.update({
  where: { id: userId },
  data: {
    aiTutoringCount: {
      increment: 1,
    },
  },
});
```

### X.5.5 异常处理与兜底

异常处理与兜底能力决定了 AI 模块在真实环境中的稳定程度。由于系统调用的是外部大模型服务，因此“请求能否成功”“模型是否返回有效内容”“用户是否已配置可用密钥”都不可能完全由本地掌控，必须通过多层防御保证交互可解释。首先，在所有 AI 接口入口处，系统都会先检查用户登录状态，未登录直接返回 401；随后读取用户配置，如果连 apiKey 都不存在，则统一返回“请先在设置中配置并选中 API Key”或“请先在设置中配置并启用 API Key”这样的提示，避免模型调用阶段才暴露错误。其次，在实际请求模型之后，系统会检查 response.ok，如果第三方服务返回非 2xx 状态，就会抛出带状态码的错误，从而让后续 catch 统一处理。再次，模型返回体即使成功，也会继续校验 choices[0].message.content 是否存在；如果没有内容，则抛出“response did not contain content”之类的错误，防止空响应被误认为有效答案。对于对话模块，前端 AIAssistantWidget 还会在请求失败时捕获异常并回退为可读文本，保证聊天窗口不会因为一次错误而完全失去可用性。比如 sendMessage 中会先从 fetch('/api/ai/chat') 获取内容，如果接口失败，就把 error.message 作为备用消息追加到对话流；如果接口正常但 payload.content 为空，也会自动显示“当前没有可返回的内容，请重试一次。”这样的提示。命名接口与学习辅导接口也遵循相同思路：如果生成标题失败，则返回“生成名称失败”；如果辅导失败，则返回“Failed to generate tutoring content”。这种分层异常处理让系统既能向用户提供清晰反馈，又便于调试人员根据接口返回判断问题出在登录、配置、网络还是模型内容层面。对于一个教学平台来说，这种兜底并不是可有可无的补丁，而是保证用户在模型不稳定时仍能继续学习的必要条件。

核心代码如下：

```ts
if (!apiKey) {
  return NextResponse.json(
    { error: "请先在设置中配置并选中 API Key" },
    { status: 400 },
  );
}

const content = data.choices?.[0]?.message?.content?.trim();
if (!content) {
  throw new Error(`${provider} response did not contain content`);
}

catch (error) {
  console.error("AI chat request failed:", error);
  return NextResponse.json(
    { error: "AI 请求失败，请检查 API Key 或模型配置" },
    { status: 500 },
  );
}
```

## X.6 学习路线模块实现

### X.6.1 数据结构实现

学习路线模块采用“学习路线主表（learning_routes）+ 学习点表（learning_route_points）”的二级结构，以满足从整体规划到逐点执行的需求。主表负责保存路线的元信息：`id`、`user_id`、`name`、`source`（手工或 AI 生成）、`input_prompt`（用户输入的提示）、`summary`（路线摘要）、`generated_at`、`created_at`、`updated_at` 等字段；学习点表则记录每个路线下的条目：`id`、`route_id`、`title`、`description`、`point_type`（问题/比赛/论坛/自定义）、`ref_id`（引用题目/比赛/帖子的 ID，可为空）、`target_date`（目标完成日期，可为空）、`status`（pending/doing/done 等状态）与 `sort_order`（顺序）。

模块在后端定义了一组轻量的映射与工具函数，将数据库行映射为前端消费的对象结构（`LearningRoute` 与 `LearningRoutePoint`），并提供了 `GeneratedLearningRoute` 作为 AI 推荐的结构化输出类型。为了保证日期与 ID 的一致性，库层实现了 `newId()` 生成以 `lr_` 前缀的随机 ID，并对日期字符串做统一的 `normalizeDateText()` 处理，确保返回给前端的时间字段为 ISO 字符串。这些设计使得学习路线既能兼容人工创建，也能无缝接收由 LLM 输出解析后的结构化路线，用于后续持久化与展示。

核心实现片段（节选自 `lib/learning-route-db.ts`）：

```ts
function newId() {
  return `lr_${crypto.randomUUID().replaceAll("-", "")}`;
}

function normalizeDateText(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return new Date().toISOString();
}
```

### X.6.2 运行时建表机制

为了在轻量或无专门迁移系统的部署环境下仍能保证学习路线功能可用，系统在模块初始化与每次访问入口处都会执行一次运行时建表检查。实现采用 `ensureLearningRouteTables()`：它通过进程级别的全局标志避免重复建表调用（减少多次执行的性能开销），并在第一次调用时通过 `prisma.$executeRawUnsafe` 直接执行 CREATE TABLE 语句创建 `learning_routes` 与 `learning_route_points`，同时创建两个常用索引以加速按用户与按路线排序的查询。该机制的优势在于：无需依赖数据库迁移工具即可保证功能向后兼容，并支持在演示、测试或单机部署场景中快速启用学习路线服务。

考虑到并发环境与多实例部署，函数使用进程内标志避免重复创建表；对于真正的多实例并发，SQLite 的 DDL 本身具备幂等性（`CREATE TABLE IF NOT EXISTS`），因此在实践中该方案能在绝大多数教学部署场景下稳定工作。表结构也明确了外键约束（`ON DELETE CASCADE`），使得删除整条路线时其下属学习点会自动清理，避免悬挂数据。

建表实现节选（节选自 `lib/learning-route-db.ts`）：

```ts
async function ensureLearningRouteTables() {
  const scopedGlobal = globalThis as Record<string, unknown>;
  if (scopedGlobal[TABLES_READY_KEY]) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS learning_routes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      input_prompt TEXT,
      summary TEXT,
      generated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS learning_route_points (
      id TEXT PRIMARY KEY,
      route_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      point_type TEXT NOT NULL DEFAULT 'custom',
      ref_id TEXT,
      target_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(route_id) REFERENCES learning_routes(id) ON DELETE CASCADE
    );
  `);
```

### X.6.3 AI 推荐流程

学习路线的 AI 推荐流程把“用户目标 + 历史行为”作为输入，通过统一的模型调用层向已配置的模型供应商发送生成请求，并对模型返回进行严格的解析与兜底处理。实现路径集中在 `app/api/learning-routes/recommend/route.ts`：后台首先收集用户最近的提交、论坛发帖和竞赛记录，并通过 `summarizeHistory()` 将行为降维成可以放入 prompt 的统计摘要（如最近提交数、通过数、薄弱模块、近期题目和帖子示例等）。随后构造一个明确约束输出格式的 system/user prompt（要求只输出 JSON），并将其作为 `messages` 传给 `callProviderChat()`。

模型返回后并不直接写库，而是先进入 `parseGeneratedRoute()` 的严格解析逻辑：函数会在返回文本中尝试抽取出 JSON 区块并对每个字段做类型与长度裁剪（例如 `routeName` 限制 80 字符、每个点的 `title` 限制 120 字符、`points` 最多 16 条），同时把 `pointType` 限定到允许的枚举值（`problem|contest|forum|custom`）。如果解析失败或 `points` 为空，系统会回退到内置的 `fallbackGeneratedRoute()` 模板，以保证用户始终能获得一个可执行的学习路线。整个流程既保证了个性化，又保证了可用性与安全性（避免模型输出任意 HTML 或超长文本）。

AI 推荐流程关键片段（节选自 `app/api/learning-routes/recommend/route.ts`）：

```ts
const behavior = summarizeHistory({
  submissions: user.submissions,
  posts: user.forumPosts,
  contests: user.contestRegistrations,
});

const prompt = [
  "请生成一个学习路线 JSON（不要输出任何解释文本，只输出 JSON 对象）。",
  ...
].join("\n");

const raw = await callProviderChat({
  provider,
  apiKey,
  model,
  messages: [
    { role: "system", content: "你是在线编程学习平台的学习路径规划器..." },
    { role: "user", content: prompt },
  ],
});

const generated = parseGeneratedRoute(raw, topic);
```

### X.6.4 路线生命周期管理

学习路线模块提供从创建到删除的完整生命周期管理：用户可以请求生成（AI 自动）或手动创建一条路线，查看个人路线列表，查看路线详情（包含按顺序的学习点），对某个学习点进行局部更新（状态、标题、描述、目标日期），以及删除整条路线。实现上，库层提供了一组 CRUD 风格的函数：`createLearningRoute()` 将解析后的 `GeneratedLearningRoute` 持久化为主表与点表记录；`getLearningRoutesByUser()` 按用户返回最近若干条路线；`getLearningRouteDetailById()` 返回包含点数组的完整路线详情；`updateLearningRoutePoint()` 提供对单个点的局部修改并保证只有该路线归属用户可以修改；`deleteLearningRoute()` 则以 `DELETE ... WHERE id = ? AND user_id = ?` 的方式确保只能删除自己的路线。

在并发安全性上，创建操作按顺序插入点记录并在写入后调用 `getLearningRouteDetailById()` 返回最终结构，更新点的实现先做一次跨表查询以确认 `pointId` 属于该 `userId` 的路线，再分别更新状态、标题、描述或目标日期中的任意字段（仅更新传入的字段），最后刷新父路由的 `updated_at` 字段。这保证了对单点修改的原子性与归属校验，避免越权或误更新。

创建与更新关键实现片段（节选自 `lib/learning-route-db.ts`）：

```ts
export async function createLearningRoute(params: {
  userId: string;
  source: "manual" | "ai";
  inputPrompt?: string | null;
  generated: GeneratedLearningRoute;
}) {
  const routeId = newId();
  const nowText = new Date().toISOString();

  await prisma.$executeRawUnsafe(
    `INSERT INTO learning_routes (id, user_id, name, source, input_prompt, summary, generated_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    routeId,
    userId,
    generated.routeName,
    source,
    inputPrompt ?? null,
    generated.summary,
    nowText,
    nowText,
    nowText,
  );

  for (let index = 0; index < generated.points.length; index += 1) {
    const point = generated.points[index];
    await prisma.$executeRawUnsafe(
      `INSERT INTO learning_route_points (id, route_id, title, description, point_type, ref_id, target_date, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      newId(),
      routeId,
      point.title,
      point.description,
      point.pointType,
      point.refId ?? null,
      point.targetDate ?? null,
      point.status ?? "pending",
      index,
    );
  }

  return getLearningRouteDetailById({ userId, routeId });
}
```

### X.6.5 解析失败兜底

模型输出的不确定性是 AI 推荐系统必须面对的现实问题：模型可能输出非 JSON 文本、包含额外解释文字、或是生成格式不完全符合预期的字段。为此，系统在 `parseGeneratedRoute()` 中实现了多层兜底策略：

- 首先尝试从原始返回中抽取最外层 JSON 对象（通过查找首个 `{` 与最后一个 `}`），并对提取到的 JSON 进行 `JSON.parse()`，减少因为模型在前后添加自然语言注释导致的解析失败。
- 解析成功后对每个字段进行严格的类型与长度裁剪（例如 `routeName`、`summary`、每个 `point.title` 与 `point.description` 的长度限制），并把 `pointType` 归一化为允许的枚举值。
- 如果上述解析流程抛出异常或 `points` 数组为空，则直接返回 `fallbackGeneratedRoute(topic)`：该函数会基于当前日期自动生成一个结构化、可执行并带有时间线的默认路线（包含梳理要点、练习题、模拟赛与讨论总结等），确保前端与用户始终能获得可用的学习计划。

兜底实现节选（节选自 `app/api/learning-routes/recommend/route.ts`）：

```ts
function parseGeneratedRoute(
  raw: string,
  topic: string,
): GeneratedLearningRoute {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const jsonText =
      start >= 0 && end > start ? raw.slice(start, end + 1) : raw;

    const parsed = JSON.parse(jsonText) as Partial<GeneratedLearningRoute>;
    // 字段裁剪与容错 ...
    if (points.length === 0) {
      return fallbackGeneratedRoute(topic);
    }

    return { routeName, summary, points };
  } catch {
    return fallbackGeneratedRoute(topic);
  }
}
```

通过以上解析与兜底策略，学习路线模块在面对模型不确定输出时能保证最低可用性，同时在解析成功时也能尽可能保留模型给出的个性化建议，从而在“个性化推荐”与“功能稳定性”之间取得工程上的平衡。

## X.7 竞赛与论坛模块实现

### X.7.1 竞赛报名实现

竞赛模块的报名/退赛实现以“最小权限 + 明确状态约束 + 事务一致性”为核心设计目标，主要关注点包括：保证只有登录用户能报名、仅在比赛未开始前允许报名/退赛、避免重复报名，以及在并发场景下保持 `participantCount` 与报名表一致。实现上，接口首先通过 `auth()` 校验会话，保证调用者已登录；随后读取比赛当前状态与当前用户是否已报名的信息，用以做业务分支判断。这一步既是业务校验，也是用户友好性提升（提前返回友好的错误信息），避免在后续事务中抛出模糊异常。

在真正写入层面，系统使用 Prisma 的事务能力把“创建/删除报名记录”和“更新比赛 participantCount”两个写操作放在同一事务中执行，确保在任一异常情况下不会出现部分生效的脏数据。对于报名（POST）流程，还要保证幂等性：若用户已报名，应返回 409（Already registered）；对于退赛（DELETE）流程，若用户未报名，应返回 409（Not registered）。此外，接口对比赛状态也做严格检查：只有当 `contest.status === ContestStatus.NOT_STARTED`（尚未开始）时才允许报名或退赛，比赛开始后一律拒绝修改报名表，避免影响赛中榜单与比分计算逻辑。

该设计还能应对常见并发场景：比如多个客户端近乎同时提交报名请求时，数据库事务会序列化这类写入，participantCount 的原子性更新（`increment` / `decrement`）避免了计数错位问题；若出现唯一约束冲突或事务回滚，接口会将冲突以业务错误的形式反馈给客户端，由前端做相应提示或重试逻辑。

代码节选（竞赛报名 / 退赛实现，来自 `app/api/contests/[id]/register/route.ts`）：

```ts
export async function POST(_request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const contest = await prisma.contest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      participantCount: true,
      registrations: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
  });

  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  if (contest.status !== ContestStatus.NOT_STARTED) {
    return NextResponse.json(
      { error: "Only not started contests can be registered" },
      { status: 400 },
    );
  }

  if (contest.registrations.length > 0) {
    return NextResponse.json({ error: "Already registered" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.contestRegistration.create({
      data: {
        contestId: contest.id,
        userId: session.user.id,
      },
    }),
    prisma.contest.update({
      where: { id: contest.id },
      data: {
        participantCount: {
          increment: 1,
        },
      },
    }),
  ]);

  return NextResponse.json({ registered: true }, { status: 201 });
}
```

以上实现展示了几个工程要点：一是用业务状态过滤（`ContestStatus.NOT_STARTED`）保证规则一致性；二是用事务同时维护报名表与计数，避免竞争导致的不一致；三是通过早期校验与幂等性判断（已报名/未报名）为前端提供明确的错误码，便于 UX 处理。

### X.7.2 论坛发帖实现

论坛板块的发帖实现以“输入校验、语义约束、引用校验”为核心，目的是让帖子既具备自由表达能力，又能在题目版等严谨分类下保持数据语义的正确性。接口使用 `zod` 对入参进行严格校验，要求 `title`、`content` 不为空并对长度进行限制，`board` 字段使用 Prisma 的 `ForumBoard` 枚举保证只接受受控的版面类型。除此之外，为了支持“题目版帖子必须绑定真实题目”的规则，接口在 `board === ForumBoard.PROBLEM` 时强制要求 `problemNumber` 字段，并会通过 `prisma.problem.findFirst` 将题号映射为内部 `problemId`，若题目不存在则返回 404，从而把语义正确性约束落实到服务端。

在持久化层，接口使用 `prisma.forumPost.create` 进行入库，并只在返回给客户端时暴露最小需要的信息（如 `postId`），避免将过多内部字段泄露给前端。该设计在兼顾灵活性的同时也利于后续的审核、举报与删除策略，例如管理端可以基于 `board`、`problemId` 做更精细的权限与可见性处理。

工程上的注意点包括：对 `content` 的必要清洗（前端/后端双重防护）以防止 XSS 或恶意脚本，图片或附件应通过专门的上传通道保存并以引用形式写入帖子；对高频发帖用户应考虑节流或验证码触发策略以防止刷屏；对于题目版发帖，必须明确题号-题目映射逻辑以保证讨论能够自动关联到题目详情页。

代码节选（发帖接口，来自 `app/api/forum/posts/route.ts`）：

```ts
const createPostSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1),
  board: z.nativeEnum(ForumBoard),
  problemNumber: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createPostSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid post payload" },
      { status: 400 },
    );
  }

  const { title, content, board, problemNumber } = parsed.data;

  if (board === ForumBoard.PROBLEM && !problemNumber) {
    return NextResponse.json(
      { error: "Problem board requires a problem number" },
      { status: 400 },
    );
  }

  let problemId: string | undefined;
  if (problemNumber) {
    const problem = await prisma.problem.findFirst({
      where: { problemNumber },
      select: { id: true },
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    problemId = problem.id;
  }

  const post = await prisma.forumPost.create({
    data: {
      title,
      content,
      board,
      userId: session.user.id,
      problemId,
    },
    select: { id: true },
  });

  return NextResponse.json({ postId: post.id }, { status: 201 });
}
```

以上实现既保证了输入层的严格校验，也在持久层保证了语义正确性，方便前端在渲染题目讨论时做到精确关联与跳转。

### X.7.3 评论实现

评论系统的核心目标是“轻量、可追溯、即时”，实现流程强调两个步骤：先校验被评论的帖子是否存在，再把评论写入数据库并返回结构化的对象以便前端即时渲染。实现中同样使用 `auth()` 强制登录后才能评论，使用 `zod` 对 `content` 做最小长度校验，以防止空评论或仅包含空白字符的情况。为了保证用户体验，API 在创建评论后会把必要的用户信息（如 `user.name`）与时间戳一并返回，前端可以在收到响应后立即把新评论插入到评论列表首位，无需再次请求整个评论页，从而实现“即时刷新”的交互体验。

在工程细节上，评论实现考虑了若干运营与稳定性要点：首先，确认 `post` 是否存在并返回 404 可以防止误评论到已删除或不存在的帖子；其次，在返回字段中把 `createdAt` 序列化为 ISO 字符串，避免前端因时区或序列化差异出现显示问题；再次，对于评论内容的展示，前端应对富文本或 Markdown 做安全渲染（服务端可做初步过滤），并在必要时支持评论编辑与删除的权限校验（只有作者或管理员可删除）。未来若引入实时通知，可在评论创建后触发通知队列，推送给帖子的原作者或关注者。

代码节选（创建评论并返回结构化数据，来自 `app/api/forum/posts/[id]/comments/route.ts`）：

```ts
const createCommentSchema = z.object({
  content: z.string().trim().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const post = await prisma.forumPost.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createCommentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid comment payload" },
      { status: 400 },
    );
  }

  const comment = await prisma.forumComment.create({
    data: {
      content: parsed.data.content,
      postId: id,
      userId: session.user.id,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: {
        select: { name: true },
      },
    },
  });

  return NextResponse.json(
    {
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        userName: comment.user.name,
      },
    },
    { status: 201 },
  );
}
```

通过上述实现，评论操作既能快速返回给前端用于即时渲染，又在后端保证了必要的语义校验与数据一致性，为论坛模块提供了可靠且可扩展的基础。

## X.8 统计分析模块实现

### X.8 统计分析模块实现（重写）

本节对统计分析模块的实现进行学术化表述，重点说明设计原则、实现要点与工程权衡，并将每一小节的核心实现代码置于小节末尾以便检索与引用。

### X.8.1 题目统计指标的设计与实现

题目统计（problem-level statistics）在教学平台中承担双重角色：其一为教学呈现——向教师和学习者展示题目总体难度与学习成效；其二为系统决策——为推荐算法、学习分析与教师评估提供可计算的输入。为保证统计数据的可信度与可审计性，本系统采用 Submission 作为唯一事实来源（single source of truth），并在后端进行聚合计算以保证口径一致。实现上，统计接口以题目标识 `slug` 为输入，通过一次数据库查询拉取该题及其关联提交（包含用户、判题结果明细），随后在后端将提交按业务口径进行整理：计算总体提交数（totalSubmissions）、通过数（totalAccepted）以及通过率（acceptanceRate），同时将每条提交展平成前端可直接渲染的 DTO，包含作者名、分数、创建时间与性能指标等。

工程权衡方面，后端聚合的优点在于能够同时访问 `judgeResults` 的细粒度数据，从而计算诸如平均运行时间与平均内存占用等指标；缺点在于对于极大数据量可能导致内存压力，因此在生产级部署中应配合分页或数据库侧的 group-by 聚合来限制单次读取量。为教育场景优化的实现策略是限制展示窗口（如仅返回最近 N 条提交或按时间窗过滤），既能保持交互的实时性，也能保证聚合语义的解释性。

核心实现（节选，自 `app/api/statistics/[slug]/route.ts`）：

```ts
const totalSubmissions = problem._count.submissions;
const totalAccepted = problem.submissions.filter(
  (s) => s.status === "ACCEPTED",
).length;
const acceptanceRate =
  totalSubmissions > 0
    ? Math.round((totalAccepted / totalSubmissions) * 100)
    : 0;
```

### X.8.2 提交状态分布与错误类型分析

提交分布的统计关注点是对失败原因的归类与占比计算，这一信息对课堂诊断与专题讲解尤为重要。系统在后端将提交按规范化的业务状态（如 ACCEPTED、WRONG_ANSWER、RUNTIME_ERROR、TIME_LIMIT_EXCEEDED、COMPILE_ERROR 等）进行计数，并返回一个轻量的分布对象，便于前端直接绘制饼图或柱状图用于可视化分析。实现上采取显式过滤的可读实现以利于维护与审计，同时在必要时可替换为数据库层 group-by 聚合以提高大数据下的性能。

对于教学用途，建议进一步在分布数据上加入时间维度（如按周/按月的错误类型演变），以支持教师评估教学干预效果；此外可将分布与题目标签或知识点关联，帮助定位高频错误类别所对应的薄弱知识点。

核心实现（节选，自 `app/api/statistics/[slug]/route.ts`）：

```ts
const submissionStats = {
  accepted: problem.submissions.filter((s) => s.status === "ACCEPTED").length,
  wrongAnswer: problem.submissions.filter((s) => s.status === "WRONG_ANSWER")
    .length,
  runtimeError: problem.submissions.filter((s) => s.status === "RUNTIME_ERROR")
    .length,
  timeoutError: problem.submissions.filter(
    (s) => s.status === "TIME_LIMIT_EXCEEDED",
  ).length,
  compileError: problem.submissions.filter((s) => s.status === "COMPILE_ERROR")
    .length,
};
```

### X.8.3 性能指标的抽取与优解识别

性能指标（性能度量）是对每次提交的运行效率与空间占用的度量，是判题明细 `judgeResults` 的延伸值，通常包括运行时间（timeSec）、内存占用（memoryKb）与代码长度（codeLength）等。系统在后端对每条提交的 `judgeResults` 做聚合计算以得到平均运行时间与平均内存，然后将这些指标作为提交 DTO 的字段返回，供前端在“优解集合”视图中执行进一步筛选（例如保留满分提交并按运行时间、内存或代码长度排序）。这一分层设计将计算职责放在后端，展示与排序策略则留给前端以便于实现多样化的比较视图。

实现细节包括对缺失值的稳健处理（无 judgeResults 时返回 undefined）、单位换算（memoryKb 转换为 MB）与精度控制（毫秒级或整数化），以保证前端显示的可解释性。同时对于需要长期分析的场景，可将这些性能指标汇入离线 OLAP 流程以支持更大规模的统计与多维分析。

核心实现（节选，自 `app/api/statistics/[slug]/route.ts`）：

```ts
const submissions = problem.submissions.map((submission) => ({
  id: submission.id,
  userId: submission.userId,
  userName: submission.user.name,
  language: submission.language,
  score: submission.score,
  runtime:
    submission.judgeResults.length > 0
      ? Math.round(
          (submission.judgeResults.reduce(
            (sum, jr) => sum + (jr.timeSec || 0),
            0,
          ) /
            submission.judgeResults.length) *
            1000,
        )
      : undefined,
  memory:
    submission.judgeResults.length > 0
      ? Math.round(
          submission.judgeResults.reduce(
            (sum, jr) => sum + (jr.memoryKb || 0),
            0,
          ) /
            submission.judgeResults.length /
            1024,
        )
      : undefined,
  codeLength: submission.sourceCode.length,
  createdAt: submission.createdAt,
}));
```

### X.8.4 前后端协作与工程化接口契约

统计模块的工程价值最终由其在前端的可用性与接口契约的清晰程度决定。本系统采用后端聚合、前端渲染的分层方式：后端负责将多表查询结果规整为最小可渲染 DTO，前端负责加载态、错误处理、交互排序与可视化呈现。典型的客户端实现位于 `app/statistics/statistics-client.tsx`，其加载逻辑包括请求后端 API、对 HTTP 错误进行友好化提示以及将返回的 JSON 解构为组件可消费的对象。

接口契约应明确字段含义、时间单位与缺失值语义（例如 runtime 为毫秒或 undefined 表示未测得），并在文档中列明最大返回量或分页策略，以便前端在跨页面或嵌套组件中复用该 API。实践中，建议对关键统计接口增加可选参数（如 limit、since、groupBy）以支持不同可视化场景，而不是通过修改前端代码多次请求不同粒度的数据。

客户端示例（节选，自 `app/statistics/statistics-client.tsx`）：

```ts
const response = await fetch(`/api/statistics/${problemSlug}`);
if (!response.ok) {
  throw new Error("Failed to fetch statistics");
}
const result = await response.json();
setData(result);
```

通过上述组织，统计模块既保证了后端对“事实数据”的统一治理，也赋予前端在展示层的灵活性，从而在教学场景中实现可解释、可追溯且便于教学干预的数据能力。

## X.9 前端交互与可用性实现

### X.9.1 顶部导航实现

顶部导航是整个学习平台最重要的全局交互入口之一，它不仅承担页面跳转功能，还需要承担“当前状态提示、学习入口聚合、登录态切换、滚动显隐优化、层级菜单展开”等多重职责。本项目中的顶部导航组件位于 `app/components/TopNavBar.tsx`，整体采用客户端组件实现，通过 `usePathname()`、`useEffect()`、`useRef()` 和 `useState()` 等钩子完成导航状态的动态控制。导航栏在 PC 端固定居中显示主导航，在移动/窄屏场景下则维持简洁布局；当用户滚动页面时，导航栏会根据滚动方向自动隐藏或显示，以减少对内容区域的遮挡。实现中使用一个“前后滚动位置差值阈值”的方式来判断是上滑还是下滑，这比简单监听 `scrollY > 0` 更平滑，也更符合教学平台长页面的阅读习惯。

导航条的结构分成三个部分：左侧 Logo 与站点标识、中间主导航、右侧主题切换与用户菜单。中间主导航又进一步支持“学习”这一聚合入口，包含学习概览、学习路线与 AI 对话三个子项。为了让视觉反馈更明确，当前激活项会使用 `motion.span` 渲染一条带动画的底部高亮条，实现“页签移动”的感知；同时 `isRouteActive()` 会根据当前路由与子路由状态判断是否命中，从而保证比如进入 `/learn/route` 时，“学习”父级仍保持高亮状态。导航中的图标映射采用 `navIcons` 与 `childIcons` 两张表，将路径与 Lucide 图标绑定，避免在渲染时重复手写判断逻辑。

导航还承担登录态切换职责：未登录时展示“登录”“注册”按钮，登录后则显示以用户首字母为头像的菜单按钮；点击后可以进入个人中心、设置页面或退出登录。这种设计使导航栏成为全站状态的统一窗口，不仅负责跳转，还承担了“身份感知”“学习入口可见性”和“交互一致性”的职责。

核心实现片段（节选自 `app/components/TopNavBar.tsx`）：

```ts
function isRouteActive(routeHref: string, pathname: string) {
  if (routeHref === "/") {
    return pathname === "/";
  }

  return pathname === routeHref || pathname.startsWith(`${routeHref}/`);
}

useEffect(() => {
  let lastScrollY = window.scrollY;

  const onScroll = () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY < 12) {
      setHidden(false);
      lastScrollY = currentScrollY;
      return;
    }

    if (currentScrollY > lastScrollY + 10) {
      setHidden(true);
    } else if (currentScrollY < lastScrollY - 10) {
      setHidden(false);
    }

    lastScrollY = currentScrollY;
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}, []);
```

### X.9.2 主题系统实现

主题系统的目标不是“单纯切换颜色”，而是要在整个站点中保持一致、无闪烁、可持久化的浅色/深色/系统主题体验。本项目中采用 `next-themes` 作为主题管理基础，并在 `components/theme-provider.tsx` 中将 `ThemeProvider` 包装为一个轻量的客户端组件。这个包装器在根布局中被注入，借助 `attribute="class"` 把主题值同步到 `<html>` 或根节点上，从而让 Tailwind 或全局 CSS 变量能够根据类名变化实现主题切换。默认主题设置为 `system`，并开启 `enableSystem`，这意味着当用户未手动选择主题时，页面会跟随操作系统设置自动适配。

为了避免服务器渲染与客户端主题解析之间的水合差异，主题相关按钮都使用了 `mounted` 状态门控：在 `mounted` 变为 `true` 前渲染占位元素，避免 `theme` 在 SSR 与 CSR 之间不一致导致 UI 闪烁。项目中有两处主题交互：一是导航栏中的 `ThemeModeButton`，它以系统/浅色/深色三态循环切换；二是更简洁的 `ThemeToggle` 组件，按“浅色/深色”二态切换，用于页面局部场景或其他区域复用。二者都通过 `useTheme()` 获取当前主题并调用 `setTheme()` 完成切换，这样主题变更不仅会立刻影响当前页面，也会通过本地存储和 next-themes 机制在整站持久化。

从可用性角度看，主题系统不只是视觉偏好问题，它还直接影响长时间阅读题面、代码和讨论内容时的舒适度。教学平台里大量内容是文本、代码块与统计信息，深色主题能显著降低夜间学习时的视觉疲劳，而浅色主题则更适合白天、会议或课堂场景。通过系统主题三态，平台让用户自主决定“跟随系统”还是“固定浅色/深色”，同时保证所有页面（包括导航、题库、提交、论坛、学习概览和 AI 助手）在主题切换时风格统一。

核心实现片段（节选自 `components/theme-provider.tsx` 与 `app/components/TopNavBar.tsx`）：

```ts
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemeProvider>
  );
}
```

```ts
const { theme, setTheme } = useTheme();
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

function nextMode() {
  if (mode === "system") {
    return "light";
  }
  if (mode === "light") {
    return "dark";
  }
  return "system";
}
```

### X.9.3 全局 AI 助手实现

全局 AI 助手是本项目“学习—反馈—再学习”闭环中最具交互性的前端模块之一，它不是嵌在某个页面里的普通聊天框，而是通过根布局全局注入、常驻于页面右下角的悬浮式学习伙伴。实现上，AI 助手组件位于 `app/components/AIAssistantWidget.tsx`，并在 `app/layout.tsx` 中与 `SessionProvider`、`ThemeProvider` 一起挂载到所有页面之上。这意味着用户无论当前是在题库、题目详情、提交详情、学习概览、论坛还是比赛页面，都可以随时呼出 AI 助手进行文本提问、上下文分析或学习规划。

AI 助手的能力并不局限于“对话输入”，而是包含多个面向学习场景的交互层：第一，支持用户在页面上选中文本后将其作为上下文加入对话；第二，支持预设问题与 skill 快捷入口，例如“我有哪些薄弱点”“学习规划 skill”等，避免用户每次都重新输入相似问题；第三，支持消息内容按 Markdown + 数学公式渲染，便于模型返回结构化讲解、算法推导和公式说明；第四，支持将当前对话保存到后端，变成可复用的学习记录；第五，支持面板大小拖拽，提升长文本阅读与代码分析时的舒适度。

从交互设计上看，这个组件采用了“浮层 + 抽屉式面板 + 预设上下文”的组合。用户点击底部圆形按钮打开窗口后，顶部会展示面板标题、功能说明与保存按钮；中部是消息流区域；底部是上下文按钮、预设项、输入框和发送按钮。上下文能力尤其体现了平台的教学特点：用户可以把页面上的某段题面、提交说明或自己选中的代码片段作为“selection”上下文，也可以把预置问题作为“preset”上下文加入当前消息；系统会在发送前把这些上下文统一序列化并拼接到用户问题上，这样后台模型能基于更完整的信息给出更有针对性的回答。

此外，AI 助手还支持“保存对话”功能：当消息数量超过一个阈值后，用户可以通过按钮触发 `/api/ai/generate-name` 自动生成名称，再把会话消息序列化为 JSON 提交到 `/api/ai/conversations` 保存。这样用户就可以把有价值的分析对话沉淀为长期学习资产，而不是一次性消耗内容。这一点对于题目复盘、错误总结、赛后分析尤其重要。

核心实现片段（节选自 `app/components/AIAssistantWidget.tsx` 与 `app/layout.tsx`）：

```ts
useEffect(() => {
  if (!open) {
    setSelectionMode(false);
    setPresetOpen(false);
    clearSelection();
  }
}, [open]);

function renderMessageContent(content: string) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => <p className="m-0">{children}</p>,
        code: ({ inline, children, className, ...props }: any) =>
          inline ? (
            <code className="rounded border border-ui bg-panel-strong px-1.5 py-0.5 text-[0.88em]" {...props}>
              {children}
            </code>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

```ts
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <SessionProvider basePath="/api/auth">
          <ThemeProvider>
            {children}
            <AIAssistantWidget />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

### X.9.4 富文本渲染能力

富文本渲染能力是平台在题面、论坛、AI 回答和学习材料四类内容中保持统一阅读体验的关键。项目采用 Markdown 渲染链路配合 KaTeX 数学公式支持，确保模型回复、题目描述与论坛帖子都能以结构化、可读的方式展示。最核心的实现位于 `app/components/AIAssistantWidget.tsx` 的 `renderMessageContent()`，它使用 `react-markdown`、`remark-math` 与 `rehype-katex` 组合，将 Markdown 语法与 LaTeX 公式解析并渲染为可视化内容。这样一来，AI 回答可以自然包含列表、代码块、链接、引用与公式，而不会因为纯文本输出而降低可读性。

从工程角度看，富文本渲染并不只是“把 Markdown 显示出来”，而是需要明确的组件映射与样式约束，以保证内容安全、视觉统一和布局稳定。项目在 `components` 映射中对 `p`、`ul`、`ol`、`li`、`a`、`code`、`pre`、`blockquote` 等元素进行了重写：段落去掉默认外边距，列表保留缩进但控制间距，链接使用统一的主题色与下划线，行内代码和代码块采用更清晰的边框/背景样式，引用块则通过左侧边框与弱化颜色来增强层级感。这样处理以后，AI 助手中的答案与题目详情页的说明、论坛内容的显示风格就可以统一到同一套视觉语言上，不会因为第三方 Markdown 默认样式而破坏页面一致性。

此外，`app/layout.tsx` 在根级别导入了 `katex/dist/katex.min.css`，这是公式正确显示的前提。没有这条全局样式，`rehype-katex` 输出的公式元素虽然会存在，但样式会异常或缺失。全局引入后，平台就可以在题目描述、AI 解答或学习笔记里直接使用数学符号和公式表达，如求和、极限、组合计数等，而无需额外配置。

这个富文本链路的价值在于，它直接提高了学习内容的表达力：题目分析可以用有层次的段落与列表组织； AI 讲解可以嵌入代码与公式；论坛讨论也能更自然地书写步骤说明或复杂推导。对于编程学习平台而言，表达能力本身就是学习效率的一部分，渲染链路越稳定，用户越能把注意力集中在理解内容而不是处理格式上。

核心实现片段（节选自 `app/components/AIAssistantWidget.tsx` 与 `app/layout.tsx`）：

```ts
function renderMessageContent(content: string) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => <p className="m-0">{children}</p>,
        ul: ({ children }) => (
          <ul className="m-0 list-disc pl-5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="m-0 list-decimal pl-5">{children}</ol>
        ),
        a: ({ children, ...props }) => (
          <a {...props} className="text-primary underline underline-offset-2">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

```ts
import "katex/dist/katex.min.css";
```

通过 Markdown 与 KaTeX 的结合，平台在题目说明、论坛交流与 AI 回答之间建立了统一的富文本表达基础，也为后续扩展代码高亮、表格渲染与更多教学可视化内容留出了自然入口。

## X.10 本章小结

本章从架构、鉴权、题库、评测、AI、学习路线、竞赛论坛与统计分析等方面阐述了系统实现过程。系统已具备“学习—训练—反馈—优化”的核心闭环能力，并为后续扩展（如评测并发优化、统计实时化与更精细的推荐策略）预留了清晰的工程接口。

## 总结

下面对本项目已完成的工作、当前存在的问题与下一步工作计划分别做详尽总结，以便为后续开发、部署与研究提供明确的工程与学术参考。

完成的工作

本项目在概念设计到工程实现之间完成了一条较为完整的路径，涵盖前后端一体化架构、用户鉴权、题库与评测系统、AI 辅导与对话、学习路线生成、竞赛与论坛功能以及统计分析与可视化等关键模块。具体而言：

1. 框架与基础设施搭建：采用 Next.js 的 App Router 作为统一开发框架，使页面与 API 路由在同一工程内协作，从而实现页面级与服务级的类型共享与调用一致性；在根布局中通过 `SessionProvider`、`ThemeProvider` 与 `AIAssistantWidget` 完成全局能力注入，保证了登录态、主题与 AI 助手在全站的统一可用性。

2. 认证与权限体系：实现基于 NextAuth Credentials 的认证流程，并通过 JWT 回调扩展会话信息，使 `userId` 与 `role` 可在前后端链路上高效传播；在 API 层统一使用 `auth()` 进行会话校验，并辅以资源归属检查与角色判断，形成细粒度的服务端权限控制策略。

3. 题库与题目详情：建立 Problem、Example、TestCase 等数据模型，支持题目文本、样例、测试点与评测约束的表达；题库列表与题目详情均采用动态统计口径（以 Submission 为事实源）计算通过率与尝试数，保证教学场景下数据口径的一致性。

4. 在线评测引擎：封装 Judge0 的语言映射、提交与轮询接口，设计并实现了 `runSubmissionJudging` 的异步评测流水线，包括测试点逐一提交、轮询状态、回写 JudgeResult、聚合最终提交状态与分数。实现了针对 503/504/429 的重试/退避逻辑及轮询的退避与上限控制，提升了评测链路的鲁棒性。

5. AI 能力：构建统一的模型调用层（兼容 Deepseek 与 Qwen），在对话、辅导、学习路线推荐与命名接口中复用该层；对学习辅导场景实现了提交绑定、辅导类型约束、重复生成检测与持久化计数（`aiTutoringCount`）的闭环设计。

6. 学习路线：实现了 AI 生成与手工创建两类路线的全生命周期管理；为无迁移/轻量部署场景提供运行时建表（`prisma.$executeRawUnsafe`）能力，并对模型输出采用 `parseGeneratedRoute` 的严格解析与 `fallbackGeneratedRoute` 兜底，以保证生成流程的可用性。

7. 前端交互与可用性：开发了响应式的顶部导航、主题切换（`next-themes`）与富文本渲染链路（`react-markdown` + `remark-math` + `rehype-katex`），并实现了功能丰富的全局悬浮 AI 助手组件 `AIAssistantWidget`，支持选区上下文注入、预设 skill、公式渲染与对话保存。

8. 竞赛与论坛：实现了竞赛报名事务化操作、论坛发帖与评论的语义校验与关联题目逻辑，保证了并发报名下的计数一致性与论坛内容的语义完整性。

9. 统计分析：在 `app/api/statistics/[slug]/route.ts` 中实现了题目级的聚合接口，后端负责合并 `submission` 与 `judgeResults` 的细粒度数据并输出前端可直接渲染的 DTO，组件端（`ProblemStatistics`）负责优解识别、分布可视化与用户级聚合。

10. 工程实践细节：在多处采用了 zod 输入校验、Prisma 原子自增、事务封装、日志与错误分类、SSR/CSR 水合处理（例如主题的 mounted 门控）等实践，提升了系统的健壮性与可观测性。

以上工作在功能完整性、可用性与工程可维护性上已取得较好进展，为下一步稳定化与规模化提供了坚实基础。

存在的问题

尽管项目功能已较为完整，但从工程化与生产可用性的角度仍存在若干需要关注与改进的方面，列举如下并给出成因分析与可能影响：

1. 存储与迁移策略上的局限性：当前实现中在若干模块（如学习路线、AiConversation）使用了 `prisma.$executeRawUnsafe` 进行运行时建表，以便支持轻量部署与演示场景。但该策略在多实例并发部署或迁移管理上存在风险：运行时 DDL 依赖进程内标志防止重复，但跨进程无法避免竞态，且 SQLite 在并发写入时性能和稳定性有限。长远来看，应采用数据库迁移工具（Prisma Migrate / SQL migration pipeline）并迁移到更具并发处理能力的关系型数据库（Postgres/MySQL）以提升可扩展性与版本可控性。

2. 判题与异步任务的可扩展性：目前 `runSubmissionJudging` 通过在进程内异步触发评测并使用轮询机制与退避策略与 Judge0 交互。这在轻负载下可行，但在高并发教学或竞赛场景下存在吞吐瓶颈：进程内轮询消耗资源且难以水平扩展。建议引入独立的任务队列（如 Redis + BullMQ / Bee-Queue）和工作进程池来调度评测任务，避免在 Web 进程中直接承担长轮询任务。

3. LLM 调用的成本与可靠性风险：模型调用目前优先采用用户激活的 ApiKey，统一调用层简化了供应商接入，但在频繁调用场景下容易触达到供应商限流或高成本。需要添加调用配额、费用估算与调用计费统计，必要时在前端提示用户可能的费用或限制。同时应增强对返回内容的多层校验，现有 `parseGeneratedRoute` 与 JSON 提取方法在面对复杂或恶意输出时仍可能失败或产生异常解析结果。

4. 安全与密钥管理：当前方式允许用户保存多个 ApiKeyConfig 并直接在后端读取并用于调用。若未对密钥进行加密存储或访问审计，将存在泄露与滥用风险。需要采取密钥加密（服务器端 KMS/加密字段）、密钥访问审计、以及对敏感操作的二次确认与操作日志记录。

5. 可观测性与运维缺失：项目目前缺乏完整的监控、告警与指标采集（如评测队列延迟、Judge0 错误率、LLM 调用失败率、API 响应时长等），在生产环境出现退化时难以及时定位问题。应引入 APM（如 OpenTelemetry + Jaeger / Prometheus + Grafana）与错误上报（Sentry）机制。

6. 测试覆盖与回归风险：当前代码库以功能快速实现为主，缺乏系统化的单元测试、集成测试与端到端测试。特别是评测、AI 调用与数据库原始 SQL 的逻辑需要自动化测试以避免回归。测试不足将导致重构或扩展时潜伏缺陷增多。

7. 前端安全与渲染风险：富文本渲染链路虽使用 `react-markdown` 与 KaTeX，但对用户生成内容、AI 模型返回的 HTML 或 Markdown 仍需严格消毒（XSS 防护）、图片附件处理与大小限制，以防止恶意注入或资源滥用。

8. 数据保留与隐私策略不明确：用户对话、辅助记录与 AI 辅导的持久化使平台具备重要学习资产，但同时带来隐私合规与数据保留策略需求。需在系统中明确会话/辅导/提交的保留期、导出能力与删除策略，并在用户设置中提供数据管理入口。

9. 性能优化空间：统计接口当前在本地内存中完成部分聚合与 DTO 构建，面对海量提交的题目可能出现响应延迟或内存峰值。需要在统计查询中增加分页、数据库端聚合或离线汇总表（materialized view / OLAP）来缓解实时查询压力。

下一步工作

为推动项目从功能样板向稳定可用的平台演进，建议按短中长期三个阶段推进具体工作，并在每个阶段设定验证指标以便评估成效。

短期（可在数周内完成）

1. 迁移 DDL 至迁移工具并切换默认数据库：把运行时建表的表结构迁移为 Prisma Migrate 的迁移文件，优先在开发/测试环境验证，再逐步切换到 Postgres 或 MySQL。验证指标：部署后一周内无 DDL 竞态故障，数据库连接错误率下降。

2. 将评测任务从 Web 进程中剥离：引入 Redis + 队列（BullMQ）并实现工作进程池来消费提交任务，工作进程负责与 Judge0 交互与结果回写。验证指标：高并发提交场景下 Web 响应延迟维持在正常范围，评测吞吐量提升且失败率降低。

3. 增加 LLM 调用限额与成本统计：在模型调用层加入请求计量、配额配置与失败重试策略，同时在用户设置页展示调用历史/花费估算。验证指标：LLM 调用失败率可控，费用异常调用触发告警。

中期（1-3 个月）

1. 完善安全与密钥管理：引入服务器端加密（如 KMS 或加密字段）、审计日志以及对管理界面的操作审计。验证指标：密钥泄露事件为零，审计日志覆盖关键操作。

2. 建立可观测平台：接入 Prometheus/Grafana 或 OpenTelemetry + Jaeger，采集 API 延迟、Judge0 与 LLM 错误/延迟、队列长度等关键指标，并设置基础告警。验证指标：告警命中率低于阈值且可定位问题根因时间小于 30 分钟。

3. 增加测试覆盖：为核心模块（判题流程、LLM 解析逻辑、学习路线 CRUD）编写单元与集成测试，并建立 CI 管道保证每次提交都能通过回归测试。验证指标：关键路径的自动化测试覆盖率提升至 70% 以上，CI 报告通过率达到 100%。

长期（3-12 个月）

1. 数据平台与离线分析能力：将统计数据导入专用分析仓库（如 ClickHouse / BigQuery），构建离线报表与学习画像，为教师提供班级级别的趋势分析与干预建议。验证指标：离线报表生成时间与查询性能满足教学运营需求。

2. 成本控制与商业化预备：在 LLM 使用上引入计费模型（免费额度 + 付费层），并实现对高成本调用的限流与替代策略（如本地缓存或低成本模型回退）。验证指标：平台 LLM 费用可预测且月度波动受控在预算范围内。

3. 可用性与 UX 持续改进：基于教师与学生的使用反馈，迭代题库导航、优解展示、AI 助手对话体验与学习路线推荐的交互细节，提升学习闭环的完成率。验证指标：用户留存率、课程完成率或题目解决率等教学指标出现显著提升。

实施要点与工程保障

在推进上述工作时，建议遵循以下工程策略：

- 小步快跑、分阶段验证：每个改造点都先在测试环境做灰度验证并准备回滚方案，避免整体改造带来大规模可用性中断。
- 数据兼容与迁移策略：新增迁移时要兼顾历史数据的兼容，必要时编写一次性转换脚本并在低峰期执行。
- 安全优先：对密钥、会话、用户数据与审计日志的处理要优先保证合规性与最小权限原则。
- 可观测性前置：在每一项关键改造前先定义要监控的 SLO/SLA 指标，确保变更后有可量化的效果评估。

总结语

总体而言，本项目已经形成了一个功能完整、开发友好且便于扩展的教学平台雏形。系统的核心工程实践（统一调用层、评测流水、运行时兼容策略、富文本渲染与会话持久化）为教学场景提供了可复制的技术路径。下一阶段的重点在于把这些能力工业化：引入成熟的运维、监控与安全机制，并把评测与模型调用从概念验证提升为可在生产环境长期运行的能力。按短中长期路线推进，并在每一阶段设置清晰的验证指标，将有助于把平台逐步做强、做稳并最终服务更大规模的教学与竞赛场景。

## 总结

###

```ts
// 过滤候选，先保证相关性
const candidates = prefilterVideoCandidates(
  await fetchSearchCandidates(parsed.data.query),
  parsed.data.query,
);

// 兜底结果：LLM 失败也可返回
let selectedItems = buildFallbackSelection(candidates, parsed.data.query);

try {
  // LLM 重排 + 只取前三
  const selectedIds = await rankVideosWithLLM({
    provider,
    model,
    apiKey,
    query: parsed.data.query,
    candidates,
  });
  if (selectedIds.length) {
    selectedItems = mergeSelectedWithFallback(
      selectedIds,
      candidates,
      parsed.data.query,
    );
  }
} catch {}

return NextResponse.json({ items: selectedItems.slice(0, 3) });
```
