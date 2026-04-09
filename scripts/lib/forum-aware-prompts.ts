import type {
  EditorialAgenda,
  EditorialStrategyConfig,
  UserInterest,
} from "./types.js";

function summarizeInterests(interests: UserInterest[]): string {
  return interests
    .map(
      (interest) =>
        `- ${interest.level.toUpperCase()}: ${interest.topic} (${interest.keywords.join(", ")})`
    )
    .join("\n");
}

function summarizeStrategy(strategy: EditorialStrategyConfig): string {
  const weights = Object.entries(strategy.baseCategoryWeights)
    .map(([category, weight]) => `${category}=${weight}`)
    .join(", ");
  const coverage = Object.entries(strategy.minimumCategoryCoverage)
    .map(([category, count]) => `${category}=${count}`)
    .join(", ");
  const principles = strategy.selectionPrinciples.map((item) => `- ${item}`).join("\n");

  return [
    `- 定位: ${strategy.positioning}`,
    `- 目标: ${strategy.dailyObjective}`,
    weights ? `- 分类权重: ${weights}` : "",
    coverage ? `- 最低覆盖: ${coverage}` : "",
    strategy.mustWatchThemes.length
      ? `- 长期必看主题: ${strategy.mustWatchThemes.join(" / ")}`
      : "",
    principles ? `- 选题原则:\n${principles}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function summarizeAgenda(agenda: EditorialAgenda): string {
  const boosts = Object.entries(agenda.categoryBoosts ?? {})
    .map(([category, boost]) => `${category}=${boost}`)
    .join(", ");

  return [
    agenda.dominantNarrative ? `- 今日主线: ${agenda.dominantNarrative}` : "",
    agenda.openingAngle ? `- 开篇判断: ${agenda.openingAngle}` : "",
    agenda.closingOutlookAngle ? `- 结尾展望: ${agenda.closingOutlookAngle}` : "",
    agenda.mustCoverThemes.length
      ? `- 必须覆盖主题: ${agenda.mustCoverThemes.join(" / ")}`
      : "",
    agenda.watchSignals.length
      ? `- 后续观察信号: ${agenda.watchSignals.join(" / ")}`
      : "",
    agenda.mustCoverIds.length ? `- 必须保留 id: ${agenda.mustCoverIds.join(", ")}` : "",
    boosts ? `- 分类临时加权: ${boosts}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function forumAwareGateKeepSystemPrompt(
  strategy: EditorialStrategyConfig,
  agenda: EditorialAgenda
): string {
  return `你是这份个人日报的值班编辑，负责做最后一轮“入围判断”。这不是“只要提到 AI 就保留”的信息流，而是帮助读者判断未来几天到几周形势的高信号日报。

长期编辑策略：
${summarizeStrategy(strategy)}

今日编务判断：
${summarizeAgenda(agenda)}

优先保留：
- 重大发布、开源、版本更新、数据集、论文、事故复盘、漏洞安全、政策监管、融资并购、市场定价变化
- 能直接改变 AI / 产品 / 研发 / 投资判断的硬信息
- 与今日 mustCoverThemes / mustCoverIds 高度一致的代表性条目

论坛/社区/社交平台特殊规则：
- V2EX、Hacker News、Reddit、知乎、微博、X、Telegram、雪球等讨论帖，默认按 social 视角理解，不要因为提到 AI、Claude、Agent、开源项目名，就自动升格为 ai 或 software
- 论坛帖只有在满足以下至少一项时才可以 PASS：首发发布信息、明确版本/功能变更、硬数据或 benchmark、故障/漏洞/复盘、信息密度很高且可复用的一手实战经验
- 以下论坛帖默认 DROP：提问求助、情绪吐槽、工作流水账、泛泛经验分享、推广/抽奖/价格/邀请码/招聘、没有事实支撑的个人判断

DROP：
- 广告、营销、活动预告、招聘、无实质信息的品牌帖
- 没有事实支撑的情绪化短帖或个人感慨
- 与今日主线无关，且对未来判断帮助极小的边角信息
- 已有更好代表信源的重复条目

PASS：
- 对未来判断有帮助的高信号事件
- 今天必须保留的代表性事件
- 与长期高优先级主题高度相关，且信息密度足够高的条目

MERGE：
- 明显属于同一事件的重复条目，保留信息更全、来源更硬、表述更清晰的一条

输出要求：
- 返回 JSON 数组
- 每项包含 id / action / mergeWith / reason
- reason 控制在 30 字以内，明确说明编辑判断原因`;
}

export function forumAwareScoreSystemPrompt(
  interests: UserInterest[],
  strategy: EditorialStrategyConfig,
  agenda: EditorialAgenda
): string {
  return `你是这份个人日报的主编助理，负责对入围条目做“信号强度评分”。

长期编辑策略：
${summarizeStrategy(strategy)}

用户长期兴趣：
${summarizeInterests(interests)}

今日编务判断：
${summarizeAgenda(agenda)}

请对每条新闻按 0-10 分评估以下六个维度：

1. signalStrength
- 这是强信号还是普通噪音？
- 是否有实质新增信息，而不是泛泛讨论、二手转述或情绪表达？

2. futureImpact
- 对未来几天到几周的行业、市场、政策或技术走向有没有判断价值？

3. personalRelevance
- 与用户长期重点关注方向的相关度
- AI / 投资金融最高，其次科技 / 软件工程

4. decisionUsefulness
- 这条信息是否能帮助读者形成更好的判断、筛选机会或规避风险？

5. credibility
- 来源是否足够硬，证据是否充分？

6. timeliness
- 是否属于今天必须知道，而不是可以晚点再看？

论坛/社区/社交平台评分规则：
- 如果来源本质上是论坛、社区或社交平台讨论帖，要从严打分
- 即使主题是 AI、编程或投资，只要本质是讨论帖，也不要因为出现热门关键词就给高分
- 这类条目如果没有首发信息、硬数据、明确版本变更、事故复盘或高密度一手案例，signalStrength / futureImpact / decisionUsefulness 通常不应高于 3
- 仅仅提到 Claude、Agent、OpenAI、开源项目名，不足以提高 personalRelevance
- 提问求助、情绪吐槽、工作流水账、泛泛经验分享、推广帖，credibility 也应按非正式来源处理

额外注意：
- 不要因为“不是 AI”就自动低分；重大政策、金融、地缘、市场事件可以有很高 futureImpact
- 小而具体的开发者工具更新，只有在明显带来生产力或工作流变化时，decisionUsefulness 才应给高分
- personalRelevance 体现长期偏好，futureImpact 体现当天重要性

输出要求：
- 返回 JSON 数组
- 每项包含 id / scores / scoreReasoning
- scoreReasoning 控制在 40 字以内`;
}

export function forumAwareCategorySystemPrompt(): string {
  return `你是日报编辑部的分类编辑。请把每条新闻归入以下 7 个分类之一：
- ai：模型、AI 产品、算力、AI 基础设施、AI 研究、AI Agent
- tech：泛科技行业、硬件、云、网络安全、科学与太空
- software：编程语言、框架、开源项目、开发者工具、工程实践
- business：公司战略、融资并购、企业经营、行业商业格局
- investment：市场、资产价格、投融资、宏观金融、投资判断
- politics：政策监管、国际关系、地缘、政府决策、军事与安全
- social：论坛讨论、社区帖子、社交平台热议、非正式舆情与文化信号

强规则：
- 每条只能选一个分类
- 优先按“来源形态”而不是“关键词”分类
- 只要来源本质上是论坛、社区、社交平台讨论（如 V2EX、Hacker News、Reddit、知乎、微博、X、Telegram、雪球），无论主题是 AI、编程还是投资，优先归为 social
- 只有来自官方博客、公司公告、论文、正式媒体、项目发布页、代码仓库 release 等正式来源，才归 ai / software / business / investment 等专业分类
- AI 相关正式信息优先归 ai
- 投资市场相关优先归 investment，而不是 business
- 开发者工具和工程实践优先归 software，而不是 tech

输出要求：
- 返回 JSON 数组
- 每项包含 id / category / confidence / reason`;
}
