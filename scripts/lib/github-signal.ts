import type { NewsInsight, RawNewsItem, ScoredNewsItem } from "./types.js";

const GITHUB_TRENDING_SOURCE_PATTERN = /Trending repositories on GitHub today/i;
const GITHUB_REPO_URL_PATTERN =
  /^https?:\/\/github\.com\/[^\/?#\s]+\/[^\/?#\s]+\/?$/i;
const GITHUB_REPO_TITLE_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const AI_DEV_REPO_PATTERNS = [
  /\bai\b/i,
  /\bllm\b/i,
  /\bagent/i,
  /\brag\b/i,
  /\bmcp\b/i,
  /\bsdk\b/i,
  /framework/i,
  /spec-driven/i,
  /coding assistant/i,
  /inference/i,
  /eval/i,
  /benchmark/i,
  /模型/u,
  /智能体/u,
  /框架/u,
  /推理/u,
  /评测/u,
];
const STAR_PATTERNS = [
  /Stars:\s*([0-9][0-9,._kKmM]*)/i,
  /星标[:：]?\s*([0-9][0-9,._kKmM]*)/u,
];

function parseCompactNumber(rawValue: string): number {
  const normalized = rawValue.replace(/[,_\s]/g, "").trim();
  const multiplier = normalized.endsWith("m") || normalized.endsWith("M")
    ? 1_000_000
    : normalized.endsWith("k") || normalized.endsWith("K")
      ? 1_000
      : 1;
  const numericPart = multiplier === 1 ? normalized : normalized.slice(0, -1);
  const value = Number(numericPart);
  return Number.isFinite(value) ? Math.round(value * multiplier) : 0;
}

export function isGitHubTrendingRepoItem(
  item: Pick<RawNewsItem, "source" | "url" | "title">
): boolean {
  const source = item.source ?? "";
  const url = item.url ?? "";
  const title = item.title?.trim() ?? "";

  if (!GITHUB_TRENDING_SOURCE_PATTERN.test(source)) {
    return false;
  }

  return GITHUB_REPO_URL_PATTERN.test(url) || GITHUB_REPO_TITLE_PATTERN.test(title);
}

function isAIDevRepoItem(
  item: Pick<RawNewsItem, "title" | "url" | "content">
): boolean {
  const text = `${item.title}\n${item.url}\n${item.content ?? ""}`;
  return AI_DEV_REPO_PATTERNS.some((pattern) => pattern.test(text));
}

export function extractGitHubTrendingStars(content: string | undefined): number {
  const text = content ?? "";
  for (const pattern of STAR_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return parseCompactNumber(match[1]);
    }
  }
  return 0;
}

export function getGitHubTrendingSoftwareBonus(
  item: Pick<RawNewsItem, "category" | "source" | "url" | "title" | "content">
): number {
  if (item.category !== "software" || !isGitHubTrendingRepoItem(item)) {
    return 0;
  }

  const stars = extractGitHubTrendingStars(item.content);
  const aiDevBonus = isAIDevRepoItem(item) ? 5 : 0;
  if (stars >= 10_000) return 17 + aiDevBonus;
  if (stars >= 5_000) return 15 + aiDevBonus;
  if (stars >= 1_000) return 13 + aiDevBonus;
  return 11 + aiDevBonus;
}

type GitHubTrendingInsight = Pick<
  NewsInsight | ScoredNewsItem,
  "id" | "title" | "url" | "source" | "category" | "weightedScore"
>;

export function rebalanceInsightsForGitHubTrending<T extends GitHubTrendingInsight>(
  finalInsights: T[],
  candidateInsights: T[]
): T[] {
  const desiredTrendingCount = Math.min(
    2,
    candidateInsights.filter(
      (item) => item.category === "software" && isGitHubTrendingRepoItem(item)
    ).length
  );
  if (desiredTrendingCount === 0) {
    return finalInsights;
  }

  const nextInsights = [...finalInsights];
  const selectedIds = new Set(nextInsights.map((item) => item.id));
  const currentTrendingCount = () =>
    nextInsights.filter(
      (item) => item.category === "software" && isGitHubTrendingRepoItem(item)
    ).length;

  if (currentTrendingCount() >= desiredTrendingCount) {
    return nextInsights.sort((left, right) => right.weightedScore - left.weightedScore);
  }

  const promotedCandidates = [...candidateInsights]
    .filter(
      (item) => item.category === "software" && isGitHubTrendingRepoItem(item)
    )
    .sort((left, right) => right.weightedScore - left.weightedScore);

  for (const promoted of promotedCandidates) {
    if (currentTrendingCount() >= desiredTrendingCount) break;
    if (selectedIds.has(promoted.id)) continue;

    // Prefer swapping within the software bucket so the daily issue still keeps
    // its overall cross-category balance while surfacing hot repo projects.
    const softwareReplacement = nextInsights
      .map((item, index) => ({ item, index }))
      .filter(
        ({ item }) =>
          item.category === "software" &&
          !isGitHubTrendingRepoItem(item) &&
          item.id !== promoted.id
      )
      .sort((left, right) => left.item.weightedScore - right.item.weightedScore)[0];

    if (softwareReplacement) {
      selectedIds.delete(nextInsights[softwareReplacement.index].id);
      nextInsights[softwareReplacement.index] = promoted;
      selectedIds.add(promoted.id);
      continue;
    }

    const globalReplacement = nextInsights
      .map((item, index) => ({ item, index }))
      .filter(
        ({ item }) => !isGitHubTrendingRepoItem(item) && item.id !== promoted.id
      )
      .sort((left, right) => left.item.weightedScore - right.item.weightedScore)[0];

    if (
      !globalReplacement ||
      globalReplacement.item.weightedScore - promoted.weightedScore > 10
    ) {
      continue;
    }

    selectedIds.delete(nextInsights[globalReplacement.index].id);
    nextInsights[globalReplacement.index] = promoted;
    selectedIds.add(promoted.id);
  }

  return nextInsights.sort((left, right) => right.weightedScore - left.weightedScore);
}
