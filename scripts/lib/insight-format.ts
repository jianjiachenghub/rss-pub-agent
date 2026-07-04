import type { RawNewsItem, ScoredNewsItem } from "./types.js";
import { isCommunitySource } from "./community-source.js";

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

const DAILY_PRIMARY_SCORE_THRESHOLD = 85;
const DAILY_SECONDARY_SCORE_THRESHOLD = 80;
const DAILY_FALLBACK_SCORE_THRESHOLD = 75;
const DAILY_MIN_NORMAL_TARGET = 8;
const DAILY_EXTREME_SCORE_THRESHOLD = 84;
const DAILY_EXTREME_EXCEPTIONAL_THRESHOLD = 90;
const DAILY_CATEGORY_ORDER = [
  "ai",
  "tech",
  "software",
  "business",
  "investment",
  "politics",
  "social",
];

const DAILY_DEDUP_ANCHORS: Array<{
  id: string;
  kind: "entity" | "theme";
  pattern: RegExp;
}> = [
  { id: "fed", kind: "entity", pattern: /美联储|\bfed\b|federal reserve/i },
  { id: "trump", kind: "entity", pattern: /特朗普|白宫|trump/i },
  { id: "lisa-cook", kind: "entity", pattern: /lisa\s*cook|丽莎.?库克|理事.?库克/i },
  { id: "openai", kind: "entity", pattern: /openai/i },
  { id: "anthropic", kind: "entity", pattern: /anthropic/i },
  { id: "microsoft", kind: "entity", pattern: /微软|microsoft/i },
  { id: "google", kind: "entity", pattern: /谷歌|google/i },
  { id: "meta", kind: "entity", pattern: /\bmeta\b/i },
  { id: "apple", kind: "entity", pattern: /苹果|apple/i },
  { id: "nvidia", kind: "entity", pattern: /英伟达|nvidia/i },
  { id: "softbank", kind: "entity", pattern: /软银|softbank/i },
  { id: "lagarde", kind: "entity", pattern: /拉加德|lagarde/i },
  { id: "ecb", kind: "entity", pattern: /欧洲央行|\becb\b|european central bank/i },
  {
    id: "fed-overhaul",
    kind: "theme",
    pattern:
      /(?:美联储|\bfed\b|federal reserve).{0,30}(?:改革|重塑|改造|罢免|撤换|理事|独立性)|(?:改革|重塑|改造|罢免|撤换|理事|独立性).{0,30}(?:美联储|\bfed\b|federal reserve)/i,
  },
  { id: "equity-stake", kind: "theme", pattern: /持股|股权|\bstake\b/i },
  { id: "access-restriction", kind: "theme", pattern: /限制|收紧|禁用|封禁|access|ban/i },
  { id: "ai-regulation", kind: "theme", pattern: /监管|护栏|regulat/i },
  { id: "chip", kind: "theme", pattern: /芯片|半导体|chip|semiconductor/i },
  { id: "funding", kind: "theme", pattern: /融资|筹资|raises|funding/i },
  { id: "layoff", kind: "theme", pattern: /裁员|job cuts|layoff/i },
  { id: "power-grid", kind: "theme", pattern: /电网|用电|electricity|power/i },
  { id: "rate-policy", kind: "theme", pattern: /降息|加息|利率|央行|rate/i },
  { id: "leadership-exit", kind: "theme", pattern: /提前离开|离开|任期|转向|政坛|succession|exit/i },
  { id: "tariff", kind: "theme", pattern: /关税|tariff/i },
];

function collectTextFragments(
  value: unknown,
  fragments: string[],
  seen: Set<object>
): void {
  if (value === null || value === undefined) {
    return;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    fragments.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectTextFragments(item, fragments, seen);
    }
    return;
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return;
    }

    seen.add(value);
    for (const item of Object.values(value)) {
      collectTextFragments(item, fragments, seen);
    }
  }
}

function normalizeText(text: unknown): string {
  const fragments: string[] = [];
  collectTextFragments(text, fragments, new Set<object>());
  return fragments.join(" ").replace(/\s+/g, " ").trim();
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

function normalizeEventDedupText(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\bfederal reserve\b/g, "美联储")
    .replace(/\bfed\b/g, "美联储")
    .replace(/\s+/g, " ")
    .trim();
}

function collectEventDedupText(
  item: {
    title?: string;
    titleZh?: string;
    event?: string;
    content?: string;
  }
): string {
  return normalizeEventDedupText(
    [item.titleZh, item.title, item.event, item.content].filter(Boolean).join("\n")
  );
}

function collectAnchorIds(text: string, kind?: "entity" | "theme"): Set<string> {
  return new Set(
    DAILY_DEDUP_ANCHORS.filter(
      (anchor) => (!kind || anchor.kind === kind) && anchor.pattern.test(text)
    ).map((anchor) => anchor.id)
  );
}

function characterBigrams(text: string): Set<string> {
  const compact = text.replace(/[^\p{Script=Han}a-z0-9]+/gu, "");
  const grams = new Set<string>();
  for (let index = 0; index < compact.length - 1; index++) {
    grams.add(compact.slice(index, index + 2));
  }
  return grams;
}

function jaccardSimilarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const item of left) {
    if (right.has(item)) intersection++;
  }
  return intersection / (left.size + right.size - intersection);
}

function intersects(left: Set<string>, right: Set<string>): string[] {
  return [...left].filter((item) => right.has(item));
}

function isLikelySameDailyEvent(
  left: {
    title?: string;
    titleZh?: string;
    event?: string;
    content?: string;
  },
  right: {
    title?: string;
    titleZh?: string;
    event?: string;
    content?: string;
  }
): boolean {
  const leftText = collectEventDedupText(left);
  const rightText = collectEventDedupText(right);
  if (leftText.length < 12 || rightText.length < 12) return false;

  const leftTitle = normalizeEventDedupText(left.titleZh || left.title || "");
  const rightTitle = normalizeEventDedupText(right.titleZh || right.title || "");
  if (leftTitle.length >= 8 && leftTitle === rightTitle) return true;

  const sharedEntities = intersects(
    collectAnchorIds(leftText, "entity"),
    collectAnchorIds(rightText, "entity")
  );
  const sharedThemes = intersects(
    collectAnchorIds(leftText, "theme"),
    collectAnchorIds(rightText, "theme")
  );
  const similarity = jaccardSimilarity(
    characterBigrams(leftText),
    characterBigrams(rightText)
  );

  if (similarity >= 0.34) return true;
  if (sharedEntities.length >= 1 && sharedThemes.length >= 1 && similarity >= 0.18) {
    return true;
  }
  return sharedEntities.length >= 2 && sharedThemes.length >= 1;
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
  item: Pick<RawNewsItem, "source" | "title"> & { url?: string }
): boolean {
  return (
    isCommunitySource(item) ||
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
  item: Pick<RawNewsItem, "title" | "source" | "content" | "contentDepth"> & {
    url?: string;
  }
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

export function computeDailyInsightTarget(
  baselineTopN: number,
  items: Array<Pick<ScoredNewsItem, "weightedScore">>
): number {
  const policy = getDailyInsightSelectionPolicy(baselineTopN, items);
  return policy.targetCount;
}

function getDailyInsightSelectionPolicy(
  baselineTopN: number,
  items: Array<Pick<ScoredNewsItem, "weightedScore">>
): { scoreThreshold: number; targetCount: number } {
  const normalCap = Math.min(Math.max(Math.floor(baselineTopN), 1), 20);
  const extremeMax = 30;
  const sortedItems = [...items].sort(
    (left, right) => right.weightedScore - left.weightedScore
  );
  const exceptionalCount = sortedItems.filter(
    (item) => item.weightedScore >= DAILY_EXTREME_EXCEPTIONAL_THRESHOLD
  ).length;
  const extremeQualifiedCount = sortedItems.filter(
    (item) => item.weightedScore >= DAILY_EXTREME_SCORE_THRESHOLD
  ).length;

  if (extremeQualifiedCount >= 28 && exceptionalCount >= 16) {
    return {
      scoreThreshold: DAILY_EXTREME_SCORE_THRESHOLD,
      targetCount: Math.min(extremeMax, extremeQualifiedCount),
    };
  }

  const primaryCount = sortedItems.filter(
    (item) => item.weightedScore >= DAILY_PRIMARY_SCORE_THRESHOLD
  ).length;
  const secondaryCount = sortedItems.filter(
    (item) => item.weightedScore >= DAILY_SECONDARY_SCORE_THRESHOLD
  ).length;

  if (primaryCount >= Math.min(DAILY_MIN_NORMAL_TARGET, normalCap)) {
    return {
      scoreThreshold: DAILY_PRIMARY_SCORE_THRESHOLD,
      targetCount: Math.min(normalCap, primaryCount),
    };
  }

  if (secondaryCount >= Math.min(DAILY_MIN_NORMAL_TARGET, normalCap)) {
    return {
      scoreThreshold: DAILY_SECONDARY_SCORE_THRESHOLD,
      targetCount: Math.min(normalCap, secondaryCount),
    };
  }

  const fallbackCount = sortedItems.filter(
    (item) => item.weightedScore >= DAILY_FALLBACK_SCORE_THRESHOLD
  ).length;

  return {
    scoreThreshold: DAILY_FALLBACK_SCORE_THRESHOLD,
    targetCount: Math.min(normalCap, fallbackCount),
  };
}

export function getDailyInsightQualifiedCandidates<
  T extends Pick<ScoredNewsItem, "weightedScore">
>(items: T[], baselineTopN: number): T[] {
  const policy = getDailyInsightSelectionPolicy(baselineTopN, items);
  return [...items]
    .filter((item) => item.weightedScore >= policy.scoreThreshold)
    .sort((left, right) => right.weightedScore - left.weightedScore);
}

export function dedupeDailyInsightCandidates<
  T extends Pick<ScoredNewsItem, "weightedScore"> & {
    title?: string;
    titleZh?: string;
    event?: string;
    content?: string;
  }
>(items: T[]): T[] {
  const selected: T[] = [];

  for (const item of [...items].sort(
    (left, right) => right.weightedScore - left.weightedScore
  )) {
    if (
      selected.some((selectedItem) =>
        isLikelySameDailyEvent(item, selectedItem)
      )
    ) {
      continue;
    }
    selected.push(item);
  }

  return selected;
}

export function selectDailyInsightsByCategory<
  T extends Pick<ScoredNewsItem, "category" | "weightedScore"> & {
    title?: string;
    titleZh?: string;
    event?: string;
    content?: string;
  }
>(items: T[], baselineTopN: number): T[] {
  const policy = getDailyInsightSelectionPolicy(baselineTopN, items);
  const qualifiedItems = dedupeDailyInsightCandidates(
    getDailyInsightQualifiedCandidates(items, baselineTopN)
  );
  const categoryOrder = [
    ...DAILY_CATEGORY_ORDER,
    ...Array.from(new Set(qualifiedItems.map((item) => item.category))).filter(
      (category) => !DAILY_CATEGORY_ORDER.includes(category)
    ),
  ];
  const buckets = new Map<string, T[]>();

  for (const category of categoryOrder) {
    const bucket = qualifiedItems
      .filter((item) => item.category === category)
      .sort((left, right) => right.weightedScore - left.weightedScore);
    if (bucket.length > 0) buckets.set(category, bucket);
  }

  const selected: T[] = [];
  while (selected.length < policy.targetCount) {
    let pickedThisRound = false;

    for (const category of categoryOrder) {
      if (selected.length >= policy.targetCount) break;
      const bucket = buckets.get(category);
      const next = bucket?.shift();
      if (!next) continue;

      selected.push(next);
      pickedThisRound = true;
    }

    if (!pickedThisRound) break;
  }

  return selected;
}
