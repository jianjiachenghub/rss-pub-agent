import type { NewsInsight, RawNewsItem, ScoredNewsItem } from "./types.js";

const GITHUB_TRENDING_SOURCE_PATTERN = /Trending repositories on GitHub today/i;
const GITHUB_REPO_URL_PATTERN =
  /^https?:\/\/github\.com\/[^\/?#\s]+\/[^\/?#\s]+\/?$/i;
const GITHUB_REPO_TITLE_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
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
  if (stars >= 10_000) return 15;
  if (stars >= 5_000) return 13;
  if (stars >= 1_000) return 11;
  return 9;
}

type GitHubTrendingInsight = Pick<
  NewsInsight | ScoredNewsItem,
  "id" | "title" | "url" | "source" | "category" | "weightedScore"
>;

export function rebalanceInsightsForGitHubTrending<T extends GitHubTrendingInsight>(
  finalInsights: T[],
  candidateInsights: T[]
): T[] {
  const hasTrendingSoftware = finalInsights.some(
    (item) => item.category === "software" && isGitHubTrendingRepoItem(item)
  );
  if (hasTrendingSoftware) {
    return finalInsights;
  }

  const promoted = [...candidateInsights]
    .filter(
      (item) => item.category === "software" && isGitHubTrendingRepoItem(item)
    )
    .sort((left, right) => right.weightedScore - left.weightedScore)[0];

  if (!promoted) {
    return finalInsights;
  }

  if (finalInsights.some((item) => item.id === promoted.id)) {
    return [...finalInsights].sort(
      (left, right) => right.weightedScore - left.weightedScore
    );
  }

  const nextInsights = [...finalInsights];

  // Prefer swapping within the software bucket so the daily issue still keeps
  // its overall cross-category balance while surfacing one hot repo project.
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
    nextInsights[softwareReplacement.index] = promoted;
    return nextInsights.sort(
      (left, right) => right.weightedScore - left.weightedScore
    );
  }

  const globalReplacement = nextInsights
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) => !isGitHubTrendingRepoItem(item) && item.id !== promoted.id
    )
    .sort((left, right) => left.item.weightedScore - right.item.weightedScore)[0];

  if (
    !globalReplacement ||
    globalReplacement.item.weightedScore - promoted.weightedScore > 8
  ) {
    return finalInsights;
  }

  nextInsights[globalReplacement.index] = promoted;
  return nextInsights.sort((left, right) => right.weightedScore - left.weightedScore);
}
