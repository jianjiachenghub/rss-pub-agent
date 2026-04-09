import type {
  EditorialAgenda,
  EditorialStrategyConfig,
  GateKeepResult,
  NewsCategory,
  PipelineConfig,
  RawNewsItem,
  ScoredNewsItem,
  ScoringDimensions,
} from "./types.js";
import {
  classifyEditorialCategory,
  getCommunityScorePenalty,
  normalizeNewsCategory,
  isLowSignalCommunityItem,
} from "./community-source.js";

const CATEGORIES: NewsCategory[] = [
  "ai",
  "tech",
  "software",
  "business",
  "investment",
  "politics",
  "social",
];

const STRONG_SIGNAL_KEYWORDS = [
  "roadmap",
  "policy",
  "regulation",
  "tariff",
  "rate",
  "funding",
  "acquisition",
  "security",
  "attack",
  "breach",
  "chip",
  "gpu",
  "earnings",
  "ipo",
  "launch",
  "release",
  "open source",
  "agent",
  "model",
  "benchmark",
  "sanction",
  "ban",
  "融资",
  "并购",
  "利率",
  "关税",
  "监管",
  "禁令",
  "安全",
  "攻击",
  "漏洞",
  "芯片",
  "财报",
  "裁员",
  "发布",
  "开源",
  "模型",
  "推理",
  "市场",
];

const ACTIONABLE_KEYWORDS = [
  "sdk",
  "framework",
  "api",
  "workflow",
  "tool",
  "security",
  "open source",
  "benchmark",
  "earnings",
  "allocation",
  "部署",
  "配置",
  "开源",
  "工具",
  "工作流",
  "路线图",
  "投资",
  "风险",
];

const LOW_SIGNAL_PATTERNS = [
  /comments on hacker news/i,
  /what'?s the difference/i,
  /\broundup\b/i,
  /\bweekly\b/i,
  /入门/i,
  /教程/i,
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function keywordHits(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce(
    (count, keyword) => count + (lower.includes(keyword.toLowerCase()) ? 1 : 0),
    0
  );
}

function lowSignalPenalty(item: RawNewsItem): number {
  const text = `${item.title}\n${item.content}`;
  let penalty = LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(text)) ? 2 : 0;
  if (item.content.trim().length < 70) penalty += 1;
  return penalty;
}

function findFeedWeight(item: RawNewsItem, config: PipelineConfig): number {
  const match = config.feeds.find(
    (feed) =>
      item.sourceId === feed.id || item.sourceId.startsWith(`${feed.id}-`)
  );
  return match?.weight ?? 60;
}

function isOfficialSource(source: string): boolean {
  const lower = source.toLowerCase();
  return (
    lower.includes("blog") ||
    lower.includes("github") ||
    lower.includes("openai") ||
    lower.includes("google") ||
    lower.includes("deepmind") ||
    lower.includes("reuters") ||
    lower.includes("bloomberg") ||
    lower.includes("financial times") ||
    lower.includes("ft")
  );
}

function computeRecencyScore(publishedAt: string): number {
  const hoursAgo = (Date.now() - new Date(publishedAt).getTime()) / 3_600_000;
  if (hoursAgo <= 4) return 10;
  if (hoursAgo <= 8) return 8;
  if (hoursAgo <= 16) return 6;
  if (hoursAgo <= 24) return 5;
  return 3;
}

function computeBaseScore(
  scores: ScoringDimensions,
  weights: EditorialStrategyConfig["scoringWeights"]
): number {
  return Math.round(
    (scores.signalStrength * weights.signalStrength +
      scores.futureImpact * weights.futureImpact +
      scores.personalRelevance * weights.personalRelevance +
      scores.decisionUsefulness * weights.decisionUsefulness +
      scores.credibility * weights.credibility +
      scores.timeliness * weights.timeliness) * 10
  );
}

function categoryBonus(
  category: NewsCategory,
  strategy: EditorialStrategyConfig,
  agenda: EditorialAgenda
): number {
  const baseWeight = strategy.baseCategoryWeights[category] ?? 0.5;
  const dailyBoost = agenda.categoryBoosts[category] ?? 0;
  return Math.round((baseWeight - 0.5) * 18 + dailyBoost * 15);
}

function buildCategoryCaps(
  config: PipelineConfig,
  agenda: EditorialAgenda
): Record<NewsCategory, number> {
  const effectiveWeights = CATEGORIES.reduce((acc, category) => {
    const baseWeight = config.editorial.baseCategoryWeights[category] ?? 0.5;
    const dailyBoost = agenda.categoryBoosts[category] ?? 0;
    acc[category] = Math.max(0.05, baseWeight + dailyBoost);
    return acc;
  }, {} as Record<NewsCategory, number>);

  const totalWeight = Object.values(effectiveWeights).reduce(
    (sum, value) => sum + value,
    0
  );

  return CATEGORIES.reduce((acc, category) => {
    const minimum = config.editorial.minimumCategoryCoverage[category] ?? 0;
    const target = Math.round(
      (effectiveWeights[category] / totalWeight) * config.topN
    );
    acc[category] = Math.max(minimum, target + 1);
    return acc;
  }, {} as Record<NewsCategory, number>);
}

function computeFallbackDimensions(
  item: RawNewsItem,
  config: PipelineConfig,
  agenda: EditorialAgenda
): ScoringDimensions {
  const category = classifyEditorialCategory(item.category, item);
  const feedWeight = findFeedWeight(item, config);
  const penalty = lowSignalPenalty(item);
  const mergedText = `${item.title}\n${item.content}`;
  const signalHits = keywordHits(mergedText, STRONG_SIGNAL_KEYWORDS);
  const actionableHits = keywordHits(mergedText, ACTIONABLE_KEYWORDS);
  const interestHits = keywordHits(
    mergedText,
    config.interests.flatMap((interest) => interest.keywords)
  );
  const baseCategoryWeight =
    config.editorial.baseCategoryWeights[category] ?? 0.5;
  const dailyBoost = agenda.categoryBoosts[category] ?? 0;

  return {
    signalStrength: clamp(
      3 + signalHits * 1.2 + (feedWeight - 60) / 18 - penalty,
      0,
      10
    ),
    futureImpact: clamp(
      2.5 +
        signalHits * 1.1 +
        (category === "investment" || category === "politics" ? 1.2 : 0) +
        dailyBoost * 3,
      0,
      10
    ),
    personalRelevance: clamp(baseCategoryWeight * 8 + interestHits * 0.7, 0, 10),
    decisionUsefulness: clamp(
      2.5 +
        actionableHits * 1.1 +
        (category === "software" || category === "ai" ? 0.8 : 0) -
        penalty * 0.5,
      0,
      10
    ),
    credibility: clamp(
      3 + feedWeight / 20 + (isOfficialSource(item.source) ? 1.5 : 0),
      0,
      10
    ),
    timeliness: computeRecencyScore(item.publishedAt),
  };
}

export function buildFallbackGateKeep(
  items: RawNewsItem[],
  config: PipelineConfig,
  agenda: EditorialAgenda
): { passedItems: RawNewsItem[]; gateKeepResults: GateKeepResult[] } {
  const mustCoverIds = new Set(agenda.mustCoverIds ?? []);

  const ranked = items
    .map((item) => {
      const scores = computeFallbackDimensions(item, config, agenda);
      const category = classifyEditorialCategory(item.category, item);
      const communityPenalty = getCommunityScorePenalty(item);
      const weightedScore =
        computeBaseScore(scores, config.editorial.scoringWeights) +
        categoryBonus(category, config.editorial, agenda) +
        (mustCoverIds.has(item.id) ? 8 : 0) -
        communityPenalty;
      return {
        item,
        weightedScore,
        penalty: lowSignalPenalty(item),
        lowSignalCommunity: isLowSignalCommunityItem(item),
      };
    })
    .sort((left, right) => right.weightedScore - left.weightedScore);

  const keepCount = Math.max(Math.min(ranked.length, 90), Math.ceil(ranked.length * 0.82));
  const keepIds = new Set(
    ranked
      .filter(({ item, weightedScore, penalty, lowSignalCommunity }, index) => {
        if (lowSignalCommunity && !mustCoverIds.has(item.id)) return false;
        if (index < keepCount) return true;
        return weightedScore >= 42 && penalty < 3;
      })
      .map(({ item }) => item.id)
  );

  const gateKeepResults = items.map((item) => {
    const pass = keepIds.has(item.id);
    return {
      id: item.id,
      action: pass ? "PASS" : "DROP",
      reason: pass ? "Fallback heuristic pass" : "Fallback heuristic drop",
    } satisfies GateKeepResult;
  });

  return {
    passedItems: items.filter((item) => keepIds.has(item.id)),
    gateKeepResults,
  };
}

export function buildFallbackScores(
  items: RawNewsItem[],
  config: PipelineConfig,
  agenda: EditorialAgenda
): { selectedItems: ScoredNewsItem[]; secondaryItems: ScoredNewsItem[] } {
  const mustCoverIds = new Set(agenda.mustCoverIds ?? []);
  const allScoredItems = items
    .map((item) => {
      const category = classifyEditorialCategory(item.category, item);
      const scores = computeFallbackDimensions(item, config, agenda);
      const communityPenalty = getCommunityScorePenalty(item);
      const weightedScore = clamp(
        computeBaseScore(scores, config.editorial.scoringWeights) +
          categoryBonus(category, config.editorial, agenda) +
          (mustCoverIds.has(item.id) ? 8 : 0) -
          communityPenalty,
        0,
        100
      );

      return {
        ...item,
        category,
        scores,
        weightedScore,
        scoreReasoning: "Fallback heuristic score",
      } satisfies ScoredNewsItem;
    })
    .sort((left, right) => right.weightedScore - left.weightedScore);

  const categoryCaps = buildCategoryCaps(config, agenda);
  const selectedItems: ScoredNewsItem[] = [];
  const selectedIds = new Set<string>();
  const categoryCounts = new Map<NewsCategory, number>();

  for (const category of CATEGORIES) {
    const minimum = config.editorial.minimumCategoryCoverage[category] ?? 0;
    const candidates = allScoredItems.filter(
      (item) => normalizeNewsCategory(item.category) === category
    );

    for (const item of candidates.slice(0, minimum)) {
      if (selectedItems.length >= config.topN || selectedIds.has(item.id)) break;
      selectedItems.push(item);
      selectedIds.add(item.id);
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }

  for (const item of allScoredItems) {
    if (selectedItems.length >= config.topN || selectedIds.has(item.id)) continue;
    const category = normalizeNewsCategory(item.category);
    const currentCount = categoryCounts.get(category) ?? 0;

    if (currentCount < categoryCaps[category]) {
      selectedItems.push(item);
      selectedIds.add(item.id);
      categoryCounts.set(category, currentCount + 1);
    }
  }

  for (const item of allScoredItems) {
    if (selectedItems.length >= config.topN || selectedIds.has(item.id)) continue;
    selectedItems.push(item);
    selectedIds.add(item.id);
  }

  return {
    selectedItems: selectedItems.sort(
      (left, right) => right.weightedScore - left.weightedScore
    ),
    secondaryItems: allScoredItems
      .filter((item) => !selectedIds.has(item.id))
      .filter((item) => item.weightedScore >= 45)
      .slice(0, 60),
  };
}
