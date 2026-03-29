import type { RawNewsItem, ScoredNewsItem } from "./types.js";

export interface InsightSections {
  event: string;
  interpretation?: string;
}

const EVENT_BANNED_PATTERNS = [
  /^这条新闻/,
  /^这篇文章/,
  /^新闻讲的是/,
  /^文章讲的是/,
  /^主要讲的是/,
  /^发生了一个/,
];

const INTERPRETATION_BANNED_PATTERNS = [
  /^值得关注/,
  /^有重要影响/,
  /^建议关注后续/,
  /^后续值得继续关注/,
  /^持续关注后续进展/,
  /信号强/,
  /信息可靠/,
  /影响深远/,
  /影响行业走向/,
  /相关度高/,
  /影响有限/,
  /具有实质信息/,
];

const WEAK_EVENT_PATTERNS = [
  /出现了一条新的行业动态，但当前公开信息仍然有限/,
  /报道了“.+”这一动态，但当前能拿到的公开细节仍然有限/,
  /公开信息主要停留在问题描述/,
];

const QUESTION_TITLE_PATTERNS = [
  /^请问/,
  /^求助/,
  /^有没有/,
  /^如何/,
  /^怎么/,
  /^what\s+/i,
  /^how\s+/i,
  /^ask hn:/i,
  /^show hn:/i,
];

const TITLE_BANNED_PATTERNS = [
  /^今日判断/,
  /^今日概览/,
  /^今日焦点/,
  /^接下来要盯/,
  /^更多24h资讯/,
  /^更多 24h 资讯/,
  /^为什么值得看/,
  /^值得关注/,
  /^入选原因/,
];

const FORUM_SOURCE_PATTERNS = [/V2EX/i, /Forum/i, /贴吧/i, /知乎/i, /微博/i];

const INFORMATIVE_IMAGE_KEYWORDS = [
  "benchmark",
  "leaderboard",
  "ranking",
  "chart",
  "graph",
  "table",
  "diagram",
  "map",
  "infographic",
  "comparison",
  "对比",
  "图解",
  "图表",
  "曲线",
  "梯队",
  "排行",
  "排名",
  "路线图",
  "财报",
  "业绩",
  "份额",
];

const DECORATIVE_IMAGE_KEYWORDS = [
  "logo",
  "avatar",
  "profile",
  "headshot",
  "portrait",
  "banner",
  "icon",
  "brand",
  "thumbnail",
  "author",
  "speaker",
  "人物",
  "头像",
  "海报",
  "readhub",
  "_next/image",
  "resource.nocode",
  "opengraph",
  "githubassets",
  "placeholder",
  "default",
];

const CONCRETE_SIGNAL_KEYWORDS = [
  "入口",
  "审核",
  "估值",
  "监管",
  "合规",
  "流量",
  "成本",
  "利率",
  "油价",
  "供给",
  "需求",
  "科研",
  "验证",
  "分发",
  "治理",
  "资金",
  "风险",
  "平台",
  "模型",
  "调用",
  "货币政策",
  "产能",
  "出口",
  "利润",
  "锚点",
  "周期",
  "红利",
  "切换",
  "默认",
];

function normalizeText(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function ensureSentence(text: string): string {
  const normalized = normalizeText(text).replace(/[。；;]+$/u, "");
  if (!normalized) return "";
  return /[。！？?!]$/u.test(normalized) ? normalized : `${normalized}。`;
}

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

function chineseDominance(text: string): number {
  const normalized = normalizeText(text);
  const chinese = countMatches(normalized, /[\u4e00-\u9fff]/g);
  const ascii = countMatches(normalized, /[A-Za-z]/g);
  if (chinese === 0 && ascii === 0) return 0;
  return chinese / Math.max(1, chinese + ascii);
}

function extractChineseSentence(content: string): string {
  const normalized = normalizeText(content);
  if (!normalized) return "";
  const sentences = normalized.split(/(?<=[。！？?!])\s+/u);
  return sentences.find((sentence) => chineseDominance(sentence) >= 0.45) ?? "";
}

function normalizedTitle(title: string): string {
  return normalizeText(title).replace(/[“”"'`]/g, "");
}

function normalizeHeadline(text: string): string {
  return normalizeText(text)
    .replace(/^(?:标题|事件|解读)[:：]\s*/u, "")
    .replace(/[“”"'`]/g, "")
    .replace(/[。！？?!；;]+$/u, "")
    .trim();
}

function cleanHeadlineCandidate(text: string): string {
  return normalizeHeadline(text)
    .replace(/\s*[|｜]\s*[^|｜]+$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateHeadline(text: string, limit = 23): string {
  const normalized = cleanHeadlineCandidate(text);
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}…`;
}

export function truncateSummaryText(text: string, limit: number): string {
  const normalized = normalizeText(text);
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}...`;
}

export function buildInsightContent(sections: InsightSections): string {
  const parts = [`事件：${sections.event}`];
  if (normalizeText(sections.interpretation)) {
    parts.push(`解读：${normalizeText(sections.interpretation)}`);
  }
  return parts.join("\n\n");
}

export function isQuestionLikeTitle(title: string): boolean {
  const normalized = normalizedTitle(title);
  return (
    QUESTION_TITLE_PATTERNS.some((pattern) => pattern.test(normalized)) ||
    /[？?]$/.test(normalized)
  );
}

export function isForumLikeItem(
  item: Pick<RawNewsItem, "source" | "title">
): boolean {
  return (
    FORUM_SOURCE_PATTERNS.some((pattern) => pattern.test(item.source)) ||
    isQuestionLikeTitle(item.title)
  );
}

export function hasThinContent(
  item: Pick<RawNewsItem, "content" | "contentDepth">
): boolean {
  const depth = item.contentDepth ?? normalizeText(item.content).length;
  if (depth < 160) return true;

  const normalized = normalizeText(item.content);
  const sentenceCount = normalized
    .split(/(?<=[。！？?!])\s+/u)
    .filter(Boolean).length;

  if (sentenceCount <= 1 && depth < 240) return true;
  return false;
}

export function shouldWriteInterpretation(
  item: Pick<RawNewsItem, "title" | "source" | "content" | "contentDepth">
): boolean {
  if (isForumLikeItem(item)) return false;
  if (hasThinContent(item)) return false;
  return true;
}

export function isInformativeImage(
  imageUrl: string | undefined,
  contextText: string
): boolean {
  const url = normalizeText(imageUrl).toLowerCase();
  if (!url) return false;
  if (url.startsWith("data:image")) return false;
  if (DECORATIVE_IMAGE_KEYWORDS.some((keyword) => url.includes(keyword))) {
    return false;
  }

  const context = normalizeText(contextText).toLowerCase();
  return INFORMATIVE_IMAGE_KEYWORDS.some(
    (keyword) => url.includes(keyword) || context.includes(keyword)
  );
}

export function isWeakEventNarrative(event: string): boolean {
  const normalized = normalizeText(event);
  return WEAK_EVENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function hasConcreteDecisionSignal(text: string): boolean {
  const normalized = normalizeText(text);
  return CONCRETE_SIGNAL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function buildFallbackSections(
  item: Pick<
    ScoredNewsItem,
    "title" | "content" | "category" | "source" | "scoreReasoning" | "contentDepth"
  >
): InsightSections {
  const title = normalizedTitle(item.title);
  const chineseExcerpt = extractChineseSentence(item.content);

  let event = "";
  if (chineseExcerpt.length >= 20) {
    event = chineseExcerpt;
  } else if (/[\u4e00-\u9fff]/.test(title)) {
    if (isQuestionLikeTitle(title)) {
      const compactTitle = title.replace(/[？?]+$/u, "");
      event = `${item.source} 上出现了一则关于“${compactTitle}”的提问，目前公开信息主要停留在问题描述。`;
    } else {
      event = `${item.source} 报道了“${title}”这一动态，但当前能拿到的公开细节仍然有限。`;
    }
  } else {
    event = `${item.source} 出现了一条新的行业动态，但当前公开信息仍然有限。`;
  }

  const reasoning = normalizeText(item.scoreReasoning);
  const interpretation = shouldWriteInterpretation(item)
    && reasoning.length >= 14
    && chineseDominance(reasoning) >= 0.6
    && (reasoning.length >= 36 || hasConcreteDecisionSignal(reasoning))
    && !INTERPRETATION_BANNED_PATTERNS.some((pattern) => pattern.test(reasoning))
      ? reasoning
    : undefined;

  return {
    event: ensureSentence(event),
    interpretation: interpretation ? ensureSentence(interpretation) : undefined,
  };
}

export function buildFallbackDisplayTitle(item: {
  title: string;
  summary?: string;
  content: string;
}): string {
  const title = cleanHeadlineCandidate(item.title);
  if (
    title.length >= 8
    && chineseDominance(title) >= 0.72
    && !isQuestionLikeTitle(title)
    && !TITLE_BANNED_PATTERNS.some((pattern) => pattern.test(title))
  ) {
    return truncateHeadline(title);
  }

  const summarySentence = extractChineseSentence(item.summary ?? "");
  if (
    summarySentence
    && chineseDominance(summarySentence) >= 0.78
    && !TITLE_BANNED_PATTERNS.some((pattern) => pattern.test(summarySentence))
  ) {
    return truncateHeadline(summarySentence);
  }

  const contentSentence = extractChineseSentence(item.content);
  if (
    contentSentence
    && chineseDominance(contentSentence) >= 0.78
    && !TITLE_BANNED_PATTERNS.some((pattern) => pattern.test(contentSentence))
  ) {
    return truncateHeadline(contentSentence);
  }

  if (summarySentence) return truncateHeadline(summarySentence);
  if (contentSentence) return truncateHeadline(contentSentence);
  return truncateHeadline(title || "今日重点条目");
}

export function getInvalidInsightFields(
  title: string,
  sections: InsightSections
): Array<keyof InsightSections> {
  const invalid: Array<keyof InsightSections> = [];
  const event = normalizeText(sections.event);
  const interpretation = normalizeText(sections.interpretation);

  if (
    event.length < 18 ||
    event === normalizedTitle(title) ||
    EVENT_BANNED_PATTERNS.some((pattern) => pattern.test(event)) ||
    chineseDominance(event) < 0.35
  ) {
    invalid.push("event");
  }

  if (
    interpretation &&
    (interpretation.length < 24 ||
      INTERPRETATION_BANNED_PATTERNS.some((pattern) => pattern.test(interpretation)) ||
      chineseDominance(interpretation) < 0.55 ||
      (interpretation.length < 36 && !hasConcreteDecisionSignal(interpretation)) ||
      (interpretation.length < 30 && /对.+有.+影响/.test(interpretation)))
  ) {
    invalid.push("interpretation");
  }

  return invalid;
}

export function sanitizeInsightSections(
  title: string,
  sections: InsightSections,
  fallback: InsightSections,
  allowInterpretation: boolean
): InsightSections {
  const invalid = new Set(getInvalidInsightFields(title, sections));
  const event = ensureSentence(invalid.has("event") ? fallback.event : sections.event);

  const rawInterpretation = allowInterpretation
    ? invalid.has("interpretation")
      ? fallback.interpretation
      : sections.interpretation
    : undefined;

  return {
    event,
    interpretation: normalizeText(rawInterpretation)
      ? ensureSentence(rawInterpretation ?? "")
      : undefined,
  };
}

export function sanitizeOneLiner(value: string | undefined, title: string): string {
  const normalized = normalizeText(value).replace(/[。；;]+$/u, "");
  if (
    normalized.length >= 12 &&
    normalized.length <= 36 &&
    chineseDominance(normalized) >= 0.45
  ) {
    return normalized;
  }
  return truncateSummaryText(title, 30);
}

export function sanitizeDisplayTitle(
  value: string | undefined,
  item: {
    title: string;
    summary?: string;
    content: string;
  }
): string {
  const normalized = cleanHeadlineCandidate(value ?? "");
  if (
    normalized.length >= 8
    && normalized.length <= 34
    && chineseDominance(normalized) >= 0.72
    && !TITLE_BANNED_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    return truncateHeadline(normalized);
  }

  return buildFallbackDisplayTitle(item);
}

export function computeDailyInsightTarget(
  baselineTopN: number,
  items: Array<Pick<ScoredNewsItem, "weightedScore">>
): number {
  const baseline = Math.min(Math.max(baselineTopN, 16), 20);
  const normalMax = Math.max(baseline, 20);
  const eventMax = Math.max(normalMax, 24);
  const extremeMax = Math.max(eventMax, 30);

  const strong = items.filter((item) => item.weightedScore >= 74).length;
  const solid = items.filter((item) => item.weightedScore >= 68).length;

  if (solid >= extremeMax && strong >= 18) return extremeMax;
  if (solid >= eventMax && strong >= 12) return eventMax;
  if (solid >= normalMax) return normalMax;
  return baseline;
}
