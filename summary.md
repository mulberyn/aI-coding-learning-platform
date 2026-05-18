# 总结

## 摘要

随着人工智能技术的快速发展，以ChatGPT、DeepSeek为代表的大语言模型已展现出强大的自然语言理解与生成能力。然而，在编程教育领域，传统教学模式仍受时空限制，缺乏个性化反馈与实时辅导。如何将大语言模型技术与编程教学深度融合，构建能够提供个性化学习支持、智能代码辅导与动态学习评估的在线学习系统，成为当前值得深入探索的研究课题。

本文设计并实现了一套基于大语言模型的辅助编程学习平台。系统采用前后端一体化架构，基于Next.js框架与TypeScript语言构建，使用Prisma ORM与SQLite数据库完成数据持久化，通过NextAuth.js实现基于JWT的多角色用户认证与权限管理。系统集成Judge0在线判题引擎，支持C、C++、Python、Go、Rust、Java六种编程语言的自动化代码评测与即时反馈。在人工智能辅助方面，系统通过统一调用层兼容DeepSeek、Qwen等多款大语言模型，实现了智能代码辅导（代码分析、改进建议、错误解析）、多轮对话持久化、个性化学习路线生成以及学习概览分析等核心功能。此外，平台还提供了竞赛管理、论坛交流、题目统计可视化与数据导出等模块，形成了覆盖“学习—训练—反馈—优化”完整闭环的编程学习生态。

系统功能验证表明，该平台能够根据学生的提交记录与学习行为，自动生成针对性的辅导内容与阶梯式学习路线，有效降低学生对大模型生成内容的盲目依赖，促进学生独立思考。平台的动态统计口径、异步评测容错机制与AI调用兜底策略，保障了教学场景下的稳定性与可用性。本文的工作为人工智能赋能编程教育提供了一套可落地、可扩展的工程化解决方案。

人工智能技术；大语言模型；在线学习系统；个性化分析；代码评测

## 英文摘要

DESIGN AND IMPLEMENTATION OF AN AI-ASSISTED LEARNING SYSTEM

With the rapid development of artificial intelligence technology, large language models represented by ChatGPT and DeepSeek have demonstrated powerful capabilities in natural language understanding and generation. However, in the field of programming education, traditional teaching models are still constrained by time and space limitations and lack personalized feedback and real-time tutoring. How to deeply integrate large language model technology with programming instruction to build an online learning system that provides personalized learning support, intelligent code tutoring, and dynamic learning assessment has become a research topic worth exploring.

This paper designs and implements an assisted programming learning platform based on large language models. The system adopts an integrated front-end and back-end architecture, built on the Next.js framework and TypeScript language, uses Prisma ORM and SQLite database for data persistence, and implements JWT-based multi-role user authentication and permission management through NextAuth.js. The system integrates the Judge0 online judge engine, supporting automated code evaluation and instant feedback for six programming languages: C, C++, Python, Go, Rust, and Java. In terms of AI assistance, the system supports multiple large language models such as DeepSeek and Qwen through a unified invocation layer, and implements core functions including intelligent code tutoring (code analysis, improvement suggestions, error analysis), multi-round conversation persistence, personalized learning path generation, and learning analytics. In addition, the platform provides modules for contest management, forum communication, problem statistics visualization, and data export, forming a programming learning ecosystem that covers the complete “learning—training—feedback—optimization” loop.

Functional validation of the system shows that the platform can automatically generate targeted tutoring content and step-by-step learning paths based on students’ submission records and learning behaviors, effectively reducing students’ blind reliance on generated content from large language models and promoting independent thinking. The platform’s dynamic statistical methodology, asynchronous evaluation fault-tolerance mechanisms, and fallback strategies for AI calls ensure stability and usability in teaching scenarios. The work presented in this paper provides a deployable and extensible engineering solution for AI-empowered programming education.

KEY WORDS: Artificial Intelligence Technology; Large Language Model; Online Learning System; Personalized Analysis; Code Evaluation

## 完成的工作

本文围绕一个集成在线评测、人工智能辅导与学习路线生成等功能的编程学习平台，在概念设计到工程实现之间完成了一条较为完整的路径，涵盖前后端一体化架构、用户鉴权、题库与评测系统、AI辅导与对话、学习路线生成、竞赛与论坛以及统计分析与可视化等关键模块。

在框架与基础设施搭建方面，系统采用Next.js的App Router作为统一开发框架，使页面路由与API路由在同一工程内协作，从而实现页面级与服务级的类型共享与调用一致性。根布局通过SessionProvider、ThemeProvider和AIAssistantWidget完成全局能力注入，保障了登录态、主题切换与AI助手在全站的统一可用性。

在认证与权限体系方面，基于NextAuth的Credentials认证流程，并通过JWT回调扩展会话信息，使userId与role能够在前后端链路中高效传播。API层统一使用auth()进行会话校验，并辅以资源归属检查与角色判断，形成细粒度的服务端权限控制策略。

题库与题目详情模块建立了Problem、Example、TestCase等数据模型，支持题目文本、样例、测试点与评测约束的表达。题库列表与题目详情均采用以Submission为事实数据源的动态统计口径计算通过率与尝试数，从而在教学场景下保证数据口径的一致性。

在线评测引擎封装了Judge0的语言映射、提交与轮询接口，设计并实现了名为runSubmissionJudging的异步评测流水线，包括测试点逐一提交、轮询状态、回写JudgeResult以及聚合最终提交状态与分数。针对503、504、429等异常状态实现了重试与退避逻辑，并为轮询设定了退避与上限控制，显著提升了评测链路的鲁棒性。

在AI能力方面，系统构建了统一的模型调用层，兼容Deepseek与Qwen模型，并在对话、辅导、学习路线推荐与命名接口中复用该层。在学习辅导场景中，实现了提交绑定、辅导类型约束、重复生成检测与持久化计数（aiTutoringCount）的闭环设计，在保障服务质量的同时防止资源滥用。

学习路线模块实现了AI生成与手工创建两类路线的全生命周期管理。为适应无迁移或轻量部署场景，提供了基于prisma.$executeRawUnsafe的运行时建表能力；对模型输出采用parseGeneratedRoute进行严格解析，并通过fallbackGeneratedRoute兜底策略，保证了生成流程的可用性。

前端交互与可用性方面，开发了响应式顶部导航、基于next-themes的主题切换以及以react-markdown配合remark-math与rehype-katex实现的富文本与数学公式渲染链路。全局悬浮AI助手组件AIAssistantWidget支持选区上下文注入、预设技能、公式渲染与对话保存，进一步丰富了用户交互体验。

竞赛与论坛模块中，竞赛报名采用事务化操作，论坛发帖与评论实施语义校验并与题目关联，从而在并发报名下保证计数一致性，并维护论坛内容的语义完整性。

统计分析方面，在题目级聚合接口中，后端负责合并submission与judgeResults的细粒度数据并输出前端可直接渲染的数据传输对象；前端ProblemStatistics组件则负责最优解识别、分布可视化与用户级聚合，为教学决策提供数据支持。

在工程实践细节上，系统多处采用zod进行输入校验，利用Prisma的原子自增与事务封装保障数据一致性，并通过日志分类与错误分级增强可观测性。针对SSR与CSR水合问题，通过主题的mounted门控等手段进行处理，进一步提升了系统的健壮性与可维护性。

上述工作已在功能完整性、可用性与工程可维护性上取得良好进展，为后续的稳定化与规模化部署提供了坚实基础。

## 存在的问题

尽管项目在功能层面已较为完整，但从工程化与生产可用性的视角审视，当前实现中仍存在若干需要关注与改进的方面，其成因与可能影响分析如下。

在存储与迁移策略上，学习路线、AI对话等模块为支持轻量部署与演示场景，采用了运行时执行DDL语句的方式动态建表，并通过进程内标志防止重复执行。这种策略在多实例并发部署时存在固有风险：进程间无法避免建表竞态，且当前使用SQLite在并发写入性能与稳定性方面存在明显局限。长远来看，应当引入标准化的数据库迁移工具，并将数据库迁移至具备更强并发处理能力的关系型数据库，以提升系统的可扩展性与版本管理可控性。

在判题与异步任务的可扩展性方面，现有评测流水线在Web进程内以异步方式触发，并通过轮询与退避策略同Judge0交互。该方案在轻负载下尚可满足需求，但在高并发教学或竞赛场景中容易成为吞吐瓶颈：进程内轮询会持续消耗资源，且无法便利地实现水平扩展。后续应引入独立的任务队列与工作进程池，将评测任务从Web进程中剥离，避免长轮询任务挤占请求处理资源。

在大语言模型调用的成本与可靠性方面，系统优先使用用户激活的API密钥，统一调用层简化了供应商接入，但频繁调用易触发供应商限流或造成较高费用。目前缺少调用配额、费用估算与计费统计机制，难以进行成本控制与用户提示。同时，对模型返回内容的校验仍有不足，当面对复杂或恶意输出时，现有的结构化解析与JSON提取方法可能出现解析失败或异常结果，需要进一步构建多层校验机制，增强输出可靠性。

在安全与密钥管理方面，允许用户保存多个API密钥配置并由后端直接读取用于调用，若未对密钥进行加密存储且缺乏访问审计，将增加密钥泄露与滥用风险。应当引入服务器端加密、密钥访问审计以及敏感操作的二次确认与日志记录，以构建更安全的密钥生命周期管理。

在可观测性与运维方面，项目目前缺乏完整的监控、告警与关键指标采集，如评测队列延迟、Judge0错误率、模型调用失败率与API响应时长等。在生产环境出现性能退化或故障时，难以及时发现和定位问题。有必要引入应用性能监控与错误追踪机制，建立系统化的指标采集与告警体系。

在测试覆盖与回归风险方面，当前代码库以功能快速实现为主，系统化的单元测试、集成测试与端到端测试较为欠缺。评测、AI调用以及涉及原始SQL查询的逻辑尤其需要通过自动化测试来防止回归。测试不足将导致后续重构与功能扩展时潜在缺陷增加，影响系统长期可维护性。

在前端安全与渲染风险方面，尽管富文本渲染链路采用了较为成熟的组件，但对用户生成内容和AI模型返回的Markdown或HTML仍需实施更严格的内容消毒以防范跨站脚本攻击，同时对图片等附件进行类型与大小约束，防止恶意注入或资源滥用。

在数据保留与隐私策略方面，用户对话、辅导记录与提交数据的持久化使平台积累了重要的学习资产，但也带来了隐私合规与数据治理需求。目前系统尚未明确会话、辅导记录与提交数据的保留期限、导出能力和删除策略，需在用户设置中提供相应的数据管理入口，以满足隐私保护的基本要求。

在性能优化方面，统计接口当前在服务端完成部分聚合与数据传输对象的构建，面对海量提交数据时可能出现响应延迟或内存峰值。需要考虑在统计查询中引入分页、数据库端聚合或离线汇总表等手段，将实时聚合压力转移到更合适的计算层，以保障查询性能的稳定。

## 下一步工作计划

为将系统从功能原型推向稳定可用的教学平台，后续改进应集中于存储与架构重构、可靠性增强、安全与可观测性建设以及用户体验优化等方向。

首先，需将运行时动态建表的逻辑迁移至标准迁移工具，并将默认数据库切换为具备更强并发能力的关系型数据库，以消除多进程部署下的DDL竞态，提升写入性能。评测模块应引入消息队列与独立工作进程池，将判题任务从Web进程中剥离，避免长轮询挤占请求资源，保证高并发场景下的响应稳定性。针对大语言模型调用，应建立请求计量、配额管理与调用统计机制，辅以失败重试与降级策略，使成本可控、调用可靠。安全层面需对用户API密钥实施加密存储与访问审计，并记录敏感操作日志，防范泄露与滥用。可观测性方面需接入指标采集与分布式追踪体系，监控API延迟、队列积压及外部服务错误率，并配置相应告警。

同时，应为核心模块补齐单元测试与集成测试，搭建持续集成流水线，将关键路径的回归测试覆盖提升至可靠水平。在长期运营上，可构建离线分析能力，将统计数据导入专用仓库，形成学习画像与趋势报告，支撑教学决策；在此基础上，探索分级计费或免费额度与付费层相结合的成本模型，确保大规模使用时费用可预测。结合师生反馈，持续优化题库导航、AI辅导对话及学习路线推荐等交互细节，以提升学习闭环的完成率和用户留存。上述工作需遵循小步验证、数据兼容、安全优先和可观测性前置的工程策略，确保每项变更均具备可量化的评估依据，稳步推进平台的生产化部署。

Li Y, Chai Z, You S, et al. Student portraits and their applications in personalized learning: Theoretical foundations and practical exploration[J]. Frontiers of Digital Education, 2025, 2(2): 18.

## 论文架构

第一章，绪论。首先介绍编程教育的全球发展趋势及其面临的挑战，阐述人工智能技术赋能教育的理论演进与实践现状，分析将大语言模型融入编程学习的必要性与可行性。随后说明本文的主要研究内容与贡献，最后给出全文的组织结构。

第二章，相关技术。系统阐述本平台开发所采用的关键技术，包括Next.js全栈开发框架、Prisma ORM与SQLite数据库、NextAuth.js用户认证与权限管理、Judge0在线判题引擎以及大语言模型API集成方案，为后续系统设计与实现奠定技术基础。

第三章，系统设计。从整体架构出发，给出系统的四层结构设计。详细划分用户管理、题库系统、代码评测、竞赛管理、AI智能辅导、论坛交流、学习路线、统计分析和数据导出等九个核心功能模块，并针对用户与鉴权、AI辅导、题库评测、竞赛排行、论坛评论等关键数据模型进行数据库设计说明。

第四章，系统实现。围绕前后端一体化架构，依次阐述用户认证与权限控制、题库与题目详情、在线评测异步流程、AI智能辅导与对话系统、学习路线生成与管理、竞赛与论坛交互、统计分析以及前端主题与全局AI助手等模块的具体实现细节，重点说明核心数据流、异常处理与容错策略。

第五章，总结。归纳本文完成的主要工作，分析系统当前在存储策略、并发评测、模型调用成本、安全与可观测性等方面存在的问题，并展望下一步的改进方向，包括架构重构、任务队列引入、密钥加密与测试覆盖提升等。
