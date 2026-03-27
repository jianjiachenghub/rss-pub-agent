import type { NewsCategory, ScoredNewsItem } from "./types.js";

export interface InsightSections {
  fact: string;
  impact: string;
  judgment: string;
  action: string;
}

const FACT_BANNED_PATTERNS = [
  /^这条新闻/,
  /^这篇文章/,
  /^新闻讲的是/,
  /^文章讲的是/,
  /^主要讲的是/,
  /^这件事说明/,
  /入选今日日报/,
];

const IMPACT_BANNED_PATTERNS = [
  /^有重要影响/,
  /^值得关注/,
  /^值得继续/,
  /^影响深远/,
];

const JUDGMENT_BANNED_PATTERNS = [
  /^值得关注/,
  /^需要观察/,
  /^说明了/,
];

const ACTION_BANNED_PATTERNS = [
  /持续关注后续进展/,
  /建议关注后续/,
  /值得继续跟踪/,
  /后续值得继续/,
];

const ACTION_TIME_WINDOW_PATTERN =
  /(今天|本周|下周|下下周|未来\s*[0-9一二两三四五六七八九十]+(?:\s*[-~到至]\s*[0-9一二两三四五六七八九十]+)?\s*(?:天|周|个月|月)|接下来\s*[0-9一二两三四五六七八九十]+(?:\s*[-~到至]\s*[0-9一二两三四五六七八九十]+)?\s*(?:天|周|个月|月)|未来几周|本季度|下个版本|下一版本|下一季度)/;

const OBSERVATION_SIGNAL_PATTERN =
  /(观察|留意|确认|验证|看|盯|跟踪|披露|公布|上线|开放|落地|反馈|流向|表态|调用率|合作)/;

function normalizeText(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function ensureSentence(text: string): string {
  const normalized = normalizeText(text).replace(/[。；;]+$/u, "");
  if (!normalized) return "";
  return /[。！？.!?]$/u.test(normalized) ? normalized : `${normalized}。`;
}

function normalizedTitle(title: string): string {
  return normalizeText(title).replace(/[“”"'`]/g, "");
}

export function truncateSummaryText(text: string, limit: number): string {
  const normalized = normalizeText(text);
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}…`;
}

export function buildInsightContent(sections: InsightSections): string {
  return [
    `事实：${sections.fact}`,
    `影响：${sections.impact}`,
    `判断：${sections.judgment}`,
    `动作：${sections.action}`,
  ].join("\n");
}

function extractUsefulExcerpt(content: string): string {
  const normalized = normalizeText(content)
    .replace(/^Comments on Hacker News \| Source$/i, "")
    .replace(/^Source$/i, "");
  if (!normalized) return "";

  const firstSentence = normalized.split(/(?<=[。！？.!?])\s+/u)[0] ?? normalized;
  return firstSentence.slice(0, 110).trim();
}

function buildCategoryFallbacks(category: string): Omit<InsightSections, "fact"> {
  const normalizedCategory = category as NewsCategory;

  switch (normalizedCategory) {
    case "ai":
      return {
        impact:
          "对 AI / 产品：重点不只是模型能力本身，而是谁能把能力变成默认入口、分发优势和可持续调用场景。",
        judgment:
          "变量从“单点能力强弱”转向“入口占位、集成效率和用户迁移成本”，这会直接改写后续竞争格局。",
        action:
          "未来 1-2 周盯官方是否披露接口粒度、合作伙伴、默认入口或调用限制，这些信号决定事件是宣传还是实质进展。",
      };
    case "software":
      return {
        impact:
          "对产品 / 研发：真正的影响不在概念层，而在接口边界、接入成本、调用稳定性和工作流是否因此重排。",
        judgment:
          "变量在于工程杠杆是否被重置；如果新接口或新框架可被广泛接入，研发优先级和产品路线都会跟着调整。",
        action:
          "未来 1-2 周盯是否出现 API 文档、开发者反馈、性能数据或更明确的落地案例，再决定是否投入验证资源。",
      };
    case "tech":
      return {
        impact:
          "对研发 / 产品：这类信号的价值在于是否带来更低的实现成本、更清晰的场景边界，或新的平台依赖关系。",
        judgment:
          "变量在于技术可行性是否开始转成产品可用性；一旦从实验展示走向稳定交付，判断就需要更新。",
        action:
          "未来 1-2 周盯是否出现性能指标、实测反馈、兼容性信息或更明确的部署场景，再决定跟进深度。",
      };
    case "business":
      return {
        impact:
          "对产品 / 投资：核心影响通常落在商业化路径、资源配置和市场预期，而不是单点技术能力的展示。",
        judgment:
          "变量在于商业兑现速度和资本接受度是否变化；这会影响相关公司的议价能力、扩张节奏和估值锚点。",
        action:
          "未来 1-2 周盯融资、上市、客户签约或监管反馈是否继续强化当前叙事，再决定是否上调关注优先级。",
      };
    case "investment":
      return {
        impact:
          "对投资 / 产品：这类事件更重要的是风险偏好、估值锚点和资金流向是否调整，进而影响资源投放与市场定价。",
        judgment:
          "变量在于资金是否把它当成短期情绪还是中期定价线索；一旦资金持续反馈，判断就不能再停留在旧框架里。",
        action:
          "未来 1-2 周盯资金净流向、监管表态、发行安排或二级市场反馈是否继续验证当前方向，再更新判断。",
      };
    case "politics":
      return {
        impact:
          "对投资 / 产品：政策和地缘变化会先改变合规边界、风险偏好和供应链预期，再传导到产品路线和资本价格。",
        judgment:
          "变量在于监管预期和风险定价是否被重新锚定；如果政策信号继续强化，相关行业判断需要同步调整。",
        action:
          "未来 1-2 周盯官方表态、制裁范围、谈判进展或市场风险资产反馈是否延续，这是判断级别是否升级的关键。",
      };
    default:
      return {
        impact:
          "对读者的价值在于，它提供了一个需要重新校准判断的外部信号，而不是简单的信息增量。",
        judgment:
          "变量在于这条线索会不会继续扩散成更大的行为变化、资源变化或情绪变化，这决定它是不是短噪音。",
        action:
          "未来 1-2 周盯是否出现更多确认信息、相关方动作或外部反馈，再决定是否把它升级为长期观察项。",
      };
  }
}

export function buildFallbackSections(
  item: Pick<ScoredNewsItem, "title" | "content" | "category" | "source" | "scoreReasoning">
): InsightSections {
  const excerpt = extractUsefulExcerpt(item.content);
  const detail = excerpt && excerpt.length > 12 ? excerpt : "";
  const fact = detail
    ? ensureSentence(detail)
    : `${item.source} 报道了「${normalizedTitle(item.title)}」这一事件，当前已进入今天的高优先级候选池。`;

  const categoryFallback = buildCategoryFallbacks(item.category);
  const judgment = ensureSentence(
    `${categoryFallback.judgment.replace(/[。！？.!?]$/u, "")} 当前入选的直接原因是：${normalizeText(item.scoreReasoning)}`
  );

  return {
    fact,
    impact: ensureSentence(categoryFallback.impact),
    judgment,
    action: ensureSentence(categoryFallback.action),
  };
}

function hasPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function getInvalidInsightFields(
  title: string,
  sections: InsightSections
): Array<keyof InsightSections> {
  const invalid: Array<keyof InsightSections> = [];
  const fact = normalizeText(sections.fact);
  const impact = normalizeText(sections.impact);
  const judgment = normalizeText(sections.judgment);
  const action = normalizeText(sections.action);
  const titleText = normalizedTitle(title);

  if (
    fact.length < 18 ||
    fact === titleText ||
    hasPattern(fact, FACT_BANNED_PATTERNS)
  ) {
    invalid.push("fact");
  }

  if (
    impact.length < 20 ||
    hasPattern(impact, IMPACT_BANNED_PATTERNS) ||
    !/对\s*(AI|产品|研发|投资|工程|资本|市场)/.test(impact)
  ) {
    invalid.push("impact");
  }

  if (
    judgment.length < 20 ||
    hasPattern(judgment, JUDGMENT_BANNED_PATTERNS) ||
    !/(变量|转向|预期|格局|入口|监管|资金|供给|成本|定价|迁移)/.test(judgment)
  ) {
    invalid.push("judgment");
  }

  if (
    action.length < 18 ||
    hasPattern(action, ACTION_BANNED_PATTERNS) ||
    !ACTION_TIME_WINDOW_PATTERN.test(action) ||
    !OBSERVATION_SIGNAL_PATTERN.test(action)
  ) {
    invalid.push("action");
  }

  return invalid;
}

export function sanitizeInsightSections(
  title: string,
  sections: InsightSections,
  fallback: InsightSections
): InsightSections {
  const invalid = new Set(getInvalidInsightFields(title, sections));
  return {
    fact: ensureSentence(invalid.has("fact") ? fallback.fact : sections.fact),
    impact: ensureSentence(invalid.has("impact") ? fallback.impact : sections.impact),
    judgment: ensureSentence(
      invalid.has("judgment") ? fallback.judgment : sections.judgment
    ),
    action: ensureSentence(invalid.has("action") ? fallback.action : sections.action),
  };
}

export function sanitizeOneLiner(value: string | undefined, title: string): string {
  const normalized = normalizeText(value).replace(/[。；;]+$/u, "");
  if (normalized.length >= 12) return normalized;
  return truncateSummaryText(title, 30);
}
