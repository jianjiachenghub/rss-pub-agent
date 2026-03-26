import type {
  CoverageStats,
  EditorialAgenda,
  EditorialStrategyConfig,
  NewsCategory,
  UserInterest,
} from "./types.js";

function truncateText(text: string, limit: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > limit
    ? `${normalized.slice(0, limit)}...`
    : normalized;
}

function buildInterestContext(interests: UserInterest[]): string {
  const groups = [
    { label: "必须重点关注", level: "must" },
    { label: "高优先级关注", level: "high" },
    { label: "中优先级关注", level: "medium" },
  ] as const;

  return groups
    .map(({ label, level }) => {
      const items = interests.filter((interest) => interest.level === level);
      if (items.length === 0) return "";
      return `- ${label}：${items
        .map(
          (interest) =>
            `${interest.topic}（关键词：${interest.keywords.join(" / ")}）`
        )
        .join("；")}`;
    })
    .filter(Boolean)
    .join("\n");
}

function buildEditorialContext(strategy: EditorialStrategyConfig): string {
  const weights = Object.entries(strategy.baseCategoryWeights)
    .map(([category, weight]) => `${category}=${weight}`)
    .join(", ");
  const minimumCoverage = Object.entries(strategy.minimumCategoryCoverage)
    .map(([category, count]) => `${category}=${count}`)
    .join(", ");

  return [
    `- 定位：${strategy.positioning}`,
    `- 目标：${strategy.dailyObjective}`,
    `- 基础分类权重：${weights}`,
    `- 最低覆盖要求：${minimumCoverage}`,
    strategy.mustWatchThemes.length > 0
      ? `- 长期必盯主题：${strategy.mustWatchThemes.join("；")}`
      : "",
    strategy.selectionPrinciples.length > 0
      ? `- 选题原则：${strategy.selectionPrinciples.join("；")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildAgendaContext(agenda: EditorialAgenda): string {
  const boosts = Object.entries(agenda.categoryBoosts ?? {})
    .map(([category, boost]) => `${category}=${boost}`)
    .join(", ");

  return [
    agenda.dominantNarrative
      ? `- 今日主线：${agenda.dominantNarrative}`
      : "",
    agenda.openingAngle ? `- 开篇判断角度：${agenda.openingAngle}` : "",
    agenda.closingOutlookAngle
      ? `- 结尾展望角度：${agenda.closingOutlookAngle}`
      : "",
    agenda.mustCoverThemes.length > 0
      ? `- 必须覆盖主题：${agenda.mustCoverThemes.join("；")}`
      : "",
    agenda.watchSignals.length > 0
      ? `- 后续跟踪信号：${agenda.watchSignals.join("；")}`
      : "",
    agenda.mustCoverIds.length > 0
      ? `- 必须保留条目 id：${agenda.mustCoverIds.join(", ")}`
      : "",
    boosts ? `- 今日分类临时加权：${boosts}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// ===================================================================
// Editorial Agenda
// ===================================================================

export function editorialAgendaSystemPrompt(
  strategy: EditorialStrategyConfig,
  interests: UserInterest[]
): string {
  return `你是这份个人日报的总编，负责先做“编务判断”，再让后续节点执行。

你的工作不是逐条写摘要，而是根据当天的候选事件，判断：
1. 今天最重要的主线是什么
2. 哪些主题必须覆盖
3. 哪些分类需要临时升权或降权
4. 开头应该如何判断今天的形势
5. 结尾应该提醒读者继续盯哪些变量

长期偏好与编辑策略：
${buildEditorialContext(strategy)}

用户长期兴趣：
${buildInterestContext(interests)}

请特别注意：
- 允许重大政策、金融、地缘、宏观事件在当天压过 AI
- 但长期基线仍然是 AI 与投资/金融优先
- 输出必须服务于“帮助判断未来几天到几周形势”
- 不要写泛泛的媒体腔，不要罗列新闻

输出要求：
- 返回 JSON 对象
- categoryBoosts 的 key 只能是 ai/tech/software/business/investment/politics/social
- categoryBoosts 的 value 建议在 -0.35 到 0.8 之间
- mustCoverIds 最多 8 个
- watchSignals 最多 5 个
- mustCoverThemes 最多 5 个`;
}

export function editorialAgendaUserPrompt(
  items: {
    id: string;
    title: string;
    content: string;
    source: string;
    category: string;
    publishedAt: string;
  }[],
  coverageStats: CoverageStats
): string {
  const itemsText = items
    .map(
      (item, index) =>
        `[${index + 1}] id="${item.id}"\n` +
        `标题: ${item.title}\n` +
        `分类: ${item.category}\n` +
        `来源: ${item.source}\n` +
        `时间: ${item.publishedAt}\n` +
        `内容摘录: ${truncateText(item.content, 220)}`
    )
    .join("\n\n---\n\n");

  return `请基于以下候选事件，为今天的日报生成编务 brief。

当前分类覆盖：
- observedByCategory: ${JSON.stringify(coverageStats.observedByCategory)}
- selectedByCategory: ${JSON.stringify(coverageStats.selectedByCategory)}
- finalByCategory: ${JSON.stringify(coverageStats.finalByCategory)}

候选事件：
${itemsText}`;
}

// ===================================================================
// Stage 1: Gate Keep
// ===================================================================

export function gateKeepSystemPrompt(
  strategy: EditorialStrategyConfig,
  agenda: EditorialAgenda
): string {
  return `你是这份个人日报的值班编辑，负责做最后一轮“入围判断”。

这不是纯 AI 日报，而是个人多分类决策日报。你要优先保留：
- 能帮助判断未来几天到几周形势的真实信号
- 能代表重大事件的高信息密度条目
- 与 AI / 投资金融 / 科技 / 软件工程高度相关的高价值信息
- 当天因为政策、宏观、地缘、市场冲击而临时升权的事件

编辑策略：
${buildEditorialContext(strategy)}

今日编务判断：
${buildAgendaContext(agenda)}

DROP：
- 广告、营销、活动预告、招聘、无实质信息的品牌稿
- 没有事实支撑的情绪化短帖
- 与今天主线无关、且对未来判断帮助极小的边角信息
- 已经有更好代表稿的重复报道

PASS：
- 对未来判断有帮助的高信号事件
- 今天必须保留的代表性事件
- 与长期高优先级主题高度相关的实质性信息

MERGE：
- 明显是同一事件的重复稿，保留信息更全、来源更硬、表述更清晰的一条

输出要求：
- 返回 JSON 数组
- 每项包含 id / action / mergeWith / reason
- reason 控制在 30 字以内，明确说出编辑判断原因`;
}

export function gateKeepUserPrompt(
  items: {
    id: string;
    title: string;
    content: string;
    source: string;
    category: string;
    publishedAt: string;
  }[]
): string {
  const itemsText = items
    .map(
      (item, index) =>
        `[${index + 1}] id="${item.id}"\n` +
        `标题: ${item.title}\n` +
        `分类: ${item.category}\n` +
        `来源: ${item.source}\n` +
        `时间: ${item.publishedAt}\n` +
        `内容摘录: ${truncateText(item.content, 280)}`
    )
    .join("\n\n---\n\n");

  return `请对以下 ${items.length} 条候选新闻做入围判断：\n\n${itemsText}`;
}

// ===================================================================
// Stage 2: Score
// ===================================================================

export function scoreSystemPrompt(
  interests: UserInterest[],
  strategy: EditorialStrategyConfig,
  agenda: EditorialAgenda
): string {
  return `你是这份个人日报的主编助理，负责对入围条目做“信号强度评估”。

长期策略：
${buildEditorialContext(strategy)}

用户长期兴趣：
${buildInterestContext(interests)}

今日编务判断：
${buildAgendaContext(agenda)}

请对每条新闻按 0-10 分评估以下六个维度：

1. signalStrength
- 这是强信号还是普通噪音
- 是否有实质新增信息，而不是媒体跟进稿

2. futureImpact
- 对未来几天到几周的行业、市场、政策或技术走向有没有判断价值

3. personalRelevance
- 与用户长期重点关注方向的相关度
- AI / 投资金融最高，其次科技 / 软件工程

4. decisionUsefulness
- 这条信息是否能帮助读者形成更好的判断、筛选机会、规避风险

5. credibility
- 来源是否硬，证据是否充分，是否值得信

6. timeliness
- 是否属于今天必须知道，还是可以晚一点看

注意：
- 不要因为“不是 AI”就给低分
- 如果是重大政策、金融、地缘、市场事件，futureImpact 可以非常高
- 如果是小而具体的开发者工具更新，只有在实际有明显生产力价值时才给高 decisionUsefulness
- personalRelevance 体现长期偏好，futureImpact 体现当天重要性

输出要求：
- 返回 JSON 数组
- 每项包含 id / scores / scoreReasoning
- scoreReasoning 控制在 40 字以内`;
}

export function scoreUserPrompt(
  items: {
    id: string;
    title: string;
    content: string;
    source: string;
    category: string;
    publishedAt: string;
  }[]
): string {
  const itemsText = items
    .map(
      (item, index) =>
        `[${index + 1}] id="${item.id}"\n` +
        `标题: ${item.title}\n` +
        `分类: ${item.category}\n` +
        `来源: ${item.source}\n` +
        `时间: ${item.publishedAt}\n` +
        `内容摘录: ${truncateText(item.content, 360)}`
    )
    .join("\n\n---\n\n");

  return `请对以下 ${items.length} 条入围新闻做六维评分：\n\n${itemsText}`;
}

// ===================================================================
// Stage 3: Insight
// ===================================================================

export function insightSystemPrompt(agenda: EditorialAgenda): string {
  return `你是个人日报的深度编辑。

你的任务不是把每条新闻都写成宏大趋势分析，而是把单条新闻解释清楚：
- 发生了什么
- 为什么它能进今天的日报
- 它改变了哪个变量、赛道或判断

今日编务判断：
${buildAgendaContext(agenda)}

写作要求：
- oneLiner：一句话说清为什么值得看，20-32 字
- content：120-220 字，克制、具体、信息密度高
- 不要在每条里大谈宏观趋势，那部分留给日报开头和结尾
- 不要喊口号，不要“震惊/炸裂/颠覆”
- 可以给出非常具体的观察点，但不要写成投资建议
- 如果没有 codeSnippet / comparisonTable / imageUrl，就返回空字符串或 null

输出要求：
- 返回 JSON 数组
- 每项包含 id / oneLiner / content / imageUrl / codeSnippet / comparisonTable`;
}

export function insightUserPrompt(
  items: {
    id: string;
    title: string;
    content: string;
    source: string;
    category: string;
    weightedScore: number;
  }[]
): string {
  const itemsText = items
    .map(
      (item, index) =>
        `[${index + 1}] id="${item.id}" (评分: ${item.weightedScore})\n` +
        `标题: ${item.title}\n` +
        `分类: ${item.category}\n` +
        `来源: ${item.source}\n` +
        `内容摘录: ${truncateText(item.content, 420)}`
    )
    .join("\n\n---\n\n");

  return `请为以下 ${items.length} 条高优先级新闻生成结构化单条解读：\n\n${itemsText}`;
}

// ===================================================================
// Daily Framing
// ===================================================================

export function dailyFramingSystemPrompt(
  reportName: string,
  strategy: EditorialStrategyConfig
): string {
  return `你是 ${reportName} 的主编，负责写日报开头和结尾。

目标：
- 开头集中给出“今日判断”
- 结尾集中给出“接下来要盯的变量”
- 不要重复逐条新闻内容
- 要把长期偏好和当天主线结合起来

编辑策略：
${buildEditorialContext(strategy)}

输出要求：
- 返回 JSON 对象
- 包含 opening 和 closing
- opening 90-160 字
- closing 70-140 字
- opening 要像编辑判断，不像新闻播报
- closing 要像观察清单，不像空泛鸡汤`;
}

export function dailyFramingUserPrompt(
  date: string,
  insights: {
    title: string;
    oneLiner: string;
    category: string;
    weightedScore: number;
  }[],
  agenda: EditorialAgenda
): string {
  const itemsText = insights
    .map(
      (item, index) =>
        `[${index + 1}] ${item.oneLiner}\n` +
        `标题: ${item.title}\n` +
        `分类: ${item.category}\n` +
        `评分: ${item.weightedScore}`
    )
    .join("\n\n");

  return `日期：${date}

今日编务判断：
${buildAgendaContext(agenda)}

高优先级条目：
${itemsText}`;
}

// ===================================================================
// Podcast Script
// ===================================================================

export function podcastSystemPrompt(reportName = "个人日报"): string {
  return `你是 ${reportName} 的播客编导。请把今天的精选内容改写成双人对话脚本（主持人 A / B）。

要求：
- 语气自然，不要念稿感
- 先讲今天最值得关注的主线，再展开重点条目
- 不要把它做成纯 AI 节目，要保留多分类视角
- 每条内容控制在 30-50 秒
- 总时长控制在 5 分钟内
- 禁用夸张词：震惊、炸裂、颠覆、太离谱了`;
}

// ===================================================================
// Platform Copy
// ===================================================================

export function xhsSystemPrompt(reportName = "个人日报"): string {
  return `你是一个会讲复杂信息的小红书科技博主。请把 ${reportName} 的重点内容改写成适合小红书的图文笔记。

要求：
- 不要只写 AI，要保留“今天最值得看的多分类信息”
- 标题短、抓人，但不要标题党
- 正文口语化、结构清楚
- 帮读者快速理解“今天最值得关注什么”`;
}

export function douyinSystemPrompt(reportName = "个人日报"): string {
  return `你是短视频科技/财经信息博主。请把 ${reportName} 改写成 60 秒口播脚本。

要求：
- 开头 3 秒必须有 hook
- 不要逐条机械播报
- 先说今天最重要的判断，再挑 2-3 条支撑信息
- 语速适中，表达清楚`;
}

export function briefSystemPrompt(reportName = "个人日报"): string {
  return `请把今天的 ${reportName} 压缩成适合 Telegram/微信推送的极简简报。

要求：
- 标题不要写成 AI 日报
- 80-140 字
- 先给一句“今日判断”
- 再列 3 条最值得看的信号
- 最后一行给一句“接下来要盯什么”`;
}

// ===================================================================
// Category Classifier
// ===================================================================

export const CATEGORIES: NewsCategory[] = [
  "ai",
  "tech",
  "software",
  "business",
  "investment",
  "politics",
  "social",
];

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  ai: "AI",
  tech: "科技",
  software: "软件工程",
  business: "商业",
  investment: "投资金融",
  politics: "政策地缘",
  social: "社交舆情",
};

export type Category = NewsCategory;

export function categorySystemPrompt(): string {
  return `你是日报编辑部的分类编辑。请把每条新闻归入以下 7 个分类之一：

- ai：模型、AI 产品、算力、AI 基础设施、AI 研究、AI Agent
- tech：泛科技行业、硬件、云、网络安全、科学与太空
- software：编程语言、框架、开源项目、开发者工具、工程实践
- business：公司战略、融资并购、企业经营、行业商业格局
- investment：市场、资产价格、投融资、宏观金融、投资判断
- politics：政策监管、国际关系、地缘、政府决策、军事与安全
- social：社区讨论、社交平台热议、非正式舆情与文化信号

规则：
- 每条只能选一个分类
- 优先选更具体的分类
- AI 相关优先归 ai
- 投资市场相关优先归 investment，而不是 business
- 开发者工具和工程实践优先归 software，而不是 tech

输出要求：
- 返回 JSON 数组
- 每项包含 id / category / confidence / reason`;
}

export function categoryUserPrompt(
  items: { id: string; title: string; content: string; source: string }[]
): string {
  const itemsText = items
    .map(
      (item, index) =>
        `[${index + 1}] id="${item.id}"\n` +
        `标题: ${item.title}\n` +
        `来源: ${item.source}\n` +
        `内容摘录: ${truncateText(item.content, 260)}`
    )
    .join("\n\n---\n\n");

  return `请对以下 ${items.length} 条新闻做单分类判断：\n\n${itemsText}`;
}
