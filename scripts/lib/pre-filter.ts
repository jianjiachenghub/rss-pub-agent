import type { CoverageStats, EventCandidate, RawNewsItem } from "./types.js";
import { applyCategoryCaps, dedupeRawItems, getPublishedTime, summarizeCategoryCounts } from "./feed-fetch.js";

export const COVERAGE_MIN_TARGETS: Record<string, number> = {
  ai: 18,
  tech: 8,
  software: 8,
  business: 8,
  investment: 12,
  politics: 6,
  social: 4,
};

const EVENT_SELECTION_CAP = 140;
const EVENT_CATEGORY_CAPS: Record<string, number> = {
  ai: 38,
  tech: 16,
  software: 14,
  business: 14,
  investment: 22,
  politics: 12,
  social: 8,
};

const CATEGORY_SOURCE_HINTS: Array<{ category: string; patterns: RegExp[] }> = [
  { category: "software", patterns: [/github/i, /langchain/i, /sdk/i, /framework/i, /release/i, /编程/i, /开发/i, /开源/i] },
  { category: "investment", patterns: [/etf/i, /bitcoin/i, /btc/i, /crypto/i, /股价/i, /基金/i, /投资/i, /利率/i, /美联储/i, /雪球/i, /A股/i, /港股/i, /美股/i, /大盘/i, /涨停/i, /跌停/i, /行情/i, /央行/i, /降息/i, /加息/i, /债券/i, /期货/i, /外汇/i] },
  { category: "business", patterns: [/ipo/i, /earnings/i, /revenue/i, /融资/i, /并购/i, /财报/i, /估值/i, /market/i] },
  { category: "politics", patterns: [/tariff/i, /sanction/i, /election/i, /regulation/i, /policy/i, /关税/i, /制裁/i, /政策/i, /战争/i] },
  { category: "social", patterns: [/微博/i, /知乎/i, /twitter/i, /\bx\b/i, /reddit/i, /telegram/i, /热搜/i, /热榜/i] },
  { category: "ai", patterns: [/llm/i, /\bgpt\b/i, /claude/i, /gemini/i, /agent/i, /rag/i, /模型/i, /大模型/i, /人工智能/i, /\bai\b/i] },
  { category: "tech", patterns: [/apple/i, /google/i, /meta/i, /云/i, /芯片/i, /硬件/i, /网络/i, /database/i, /security/i] },
];

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function normalizeTitle(title: string): string {
  return normalizeWhitespace(
    title
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[【】\[\]（）()<>《》"'`~!@#$%^&*_+=|\\/:;,.?，。！？、：；]/g, " ")
  );
}

function compactTitleSignature(title: string): string {
  const normalized = normalizeTitle(title).replace(/\s/g, "");
  return normalized.slice(0, 24);
}

function buildEnglishTokenSignature(title: string): string {
  const tokens = normalizeTitle(title)
    .split(" ")
    .filter((token) => token.length >= 3 && !["the", "and", "for", "with", "from"].includes(token))
    .slice(0, 6);
  return tokens.join("-");
}

export function inferCategory(item: RawNewsItem): string {
  const source = item.source ?? "";
  const sourceHint = CATEGORY_SOURCE_HINTS.find(({ patterns }) =>
    patterns.some((pattern) => pattern.test(source))
  );
  if (sourceHint) return sourceHint.category;

  const text = `${item.title}\n${item.content}`.slice(0, 1200);
  const contentHint = CATEGORY_SOURCE_HINTS.find(({ patterns }) =>
    patterns.some((pattern) => pattern.test(text))
  );
  if (contentHint) return contentHint.category;

  return item.category === "ai" ? "tech" : item.category || "tech";
}

function buildEventKey(item: RawNewsItem): { eventKey: string; normalizedTitle: string } {
  const normalized = normalizeTitle(item.title || "");
  const englishSignature = buildEnglishTokenSignature(item.title || "");
  const compactSignature = compactTitleSignature(item.title || "");
  return {
    eventKey: englishSignature || compactSignature || normalized || item.url || item.id,
    normalizedTitle: normalized,
  };
}

function isLikelyNoise(item: RawNewsItem): boolean {
  const title = normalizeTitle(item.title || "");
  if (!title || title === "untitled") return true;
  if ((item.content || "").trim().length < 30 && title.length < 12) return true;
  return false;
}

function scoreRepresentative(item: RawNewsItem): number {
  const contentLength = Math.min((item.content || "").length, 600);
  return contentLength + getPublishedTime(item.publishedAt) / 1_000_000_000_000;
}

export function buildCoverageStats(
  observedEvents: EventCandidate[],
  selectedEvents: EventCandidate[],
  finalItems: RawNewsItem[] = selectedEvents
): CoverageStats {
  const selectedByCategory = summarizeCategoryCounts(selectedEvents);
  return {
    observedByCategory: summarizeCategoryCounts(observedEvents),
    selectedByCategory,
    finalByCategory: summarizeCategoryCounts(finalItems),
    deficitCategories: Object.entries(COVERAGE_MIN_TARGETS)
      .filter(([category, min]) => (selectedByCategory[category] ?? 0) < min)
      .map(([category]) => category),
    totalObservedEvents: observedEvents.length,
    totalSelectedEvents: selectedEvents.length,
  };
}

export function compressPrimaryItems(items: RawNewsItem[]): {
  observedEvents: EventCandidate[];
  selectedCandidates: EventCandidate[];
  coverageStats: CoverageStats;
} {
  const clusters = new Map<string, EventCandidate>();
  const sourceSets = new Map<string, Set<string>>();

  for (const item of dedupeRawItems(items)) {
    if (isLikelyNoise(item)) continue;

    const { eventKey, normalizedTitle } = buildEventKey(item);
    const category = inferCategory(item);
    const sourceSet = sourceSets.get(eventKey) ?? new Set<string>();
    sourceSet.add(item.source);
    sourceSets.set(eventKey, sourceSet);

    const existing = clusters.get(eventKey);
    if (!existing) {
      clusters.set(eventKey, {
        ...item,
        category,
        eventKey,
        normalizedTitle,
        duplicateCount: 1,
        sourceCount: 1,
        representativeSources: [item.source],
        preFilterScore: scoreRepresentative(item),
      });
      continue;
    }

    existing.duplicateCount += 1;
    existing.sourceCount = sourceSet.size;
    existing.representativeSources = [...sourceSet].slice(0, 5);

    const nextScore = scoreRepresentative(item);
    if (nextScore > existing.preFilterScore) {
      existing.id = item.id;
      existing.title = item.title;
      existing.url = item.url;
      existing.content = item.content;
      existing.source = item.source;
      existing.sourceId = item.sourceId;
      existing.category = category;
      existing.publishedAt = item.publishedAt;
      existing.fetchedAt = item.fetchedAt;
      existing.preFilterScore = nextScore;
      existing.normalizedTitle = normalizedTitle;
    }
  }

  const observedEvents = [...clusters.values()].sort((a, b) => {
    if (b.duplicateCount !== a.duplicateCount) return b.duplicateCount - a.duplicateCount;
    return getPublishedTime(b.publishedAt) - getPublishedTime(a.publishedAt);
  });

  const selectedCandidates = applyCategoryCaps(
    observedEvents,
    EVENT_CATEGORY_CAPS,
    EVENT_SELECTION_CAP
  ) as EventCandidate[];

  return {
    observedEvents,
    selectedCandidates,
    coverageStats: buildCoverageStats(observedEvents, selectedCandidates),
  };
}
