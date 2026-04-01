import { fetchRSS } from "./rss.js";
import { fetchViaFolo } from "./folo.js";
import type { FeedSource, FeedTier, PipelineError, RawNewsItem } from "./types.js";

export const FETCH_CONCURRENCY = 5;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const FINAL_RAW_CANDIDATE_CAP = 160;

export const CATEGORY_FINAL_CAP: Record<string, number> = {
  ai: 45,
  tech: 20,
  software: 18,
  business: 18,
  investment: 28,
  politics: 14,
  social: 10,
};

const DEFAULT_DAILY_CAP_BY_TIER: Record<FeedTier, number> = {
  core: 12,
  signal: 8,
  watch: 4,
};

const TIER_PRIORITY: Record<FeedTier, number> = {
  core: 0,
  signal: 1,
  watch: 2,
};

export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export function getFeedTier(feed: FeedSource): FeedTier {
  if (feed.tier) return feed.tier;
  return feed.keepInMainPool === false ? "watch" : "signal";
}

export function isMainPoolFeed(feed: FeedSource): boolean {
  return feed.keepInMainPool !== false && getFeedTier(feed) !== "watch";
}

export function getFeedDailyCap(feed: FeedSource): number {
  const cap = feed.dailyCap ?? DEFAULT_DAILY_CAP_BY_TIER[getFeedTier(feed)];
  return Math.max(1, cap);
}

export function getPublishedTime(publishedAt?: string): number {
  if (!publishedAt) return 0;
  const time = new Date(publishedAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function isRecentItem(item: RawNewsItem): boolean {
  if (!item.publishedAt) return true;
  return getPublishedTime(item.publishedAt) >= Date.now() - ONE_DAY_MS;
}

export function normalizeFeedItems(feed: FeedSource, items: RawNewsItem[]): RawNewsItem[] {
  // External coverage feeds stay cheap: 24h filter -> newest first -> source cap.
  return items
    .filter(isRecentItem)
    .sort((a, b) => getPublishedTime(b.publishedAt) - getPublishedTime(a.publishedAt))
    .slice(0, getFeedDailyCap(feed));
}

export function dedupeRawItems(items: RawNewsItem[]): RawNewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.url || `${item.sourceId}:${item.title}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function applyCategoryCaps(
  items: RawNewsItem[],
  categoryCaps: Record<string, number> = CATEGORY_FINAL_CAP,
  totalCap = FINAL_RAW_CANDIDATE_CAP
): RawNewsItem[] {
  const counts = new Map<string, number>();
  const selected: RawNewsItem[] = [];

  for (const item of items) {
    if (selected.length >= totalCap) break;

    const category = item.category || "social";
    const limit = categoryCaps[category] ?? 10;
    const current = counts.get(category) ?? 0;

    if (current >= limit) continue;

    counts.set(category, current + 1);
    selected.push(item);
  }

  return selected;
}

export function finalizeRawCandidates(items: RawNewsItem[]): RawNewsItem[] {
  const sorted = [...items].sort(
    (a, b) => getPublishedTime(b.publishedAt) - getPublishedTime(a.publishedAt)
  );
  return applyCategoryCaps(dedupeRawItems(sorted));
}

export function summarizeCategoryCounts(items: RawNewsItem[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const category = item.category || "social";
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return Object.fromEntries(counts);
}

export function compareFeeds(a: FeedSource, b: FeedSource): number {
  const tierDiff = TIER_PRIORITY[getFeedTier(a)] - TIER_PRIORITY[getFeedTier(b)];
  if (tierDiff !== 0) return tierDiff;
  return b.weight - a.weight;
}

export async function fetchSingleFeed(
  feed: FeedSource
): Promise<{ items: RawNewsItem[]; error: PipelineError | null }> {
  try {
    let items: RawNewsItem[];

    switch (feed.type) {
      case "folo":
        if (!feed.url) throw new Error("feed.url is required for folo sources");
        items = await fetchViaFolo(
          feed.url,
          feed.id,
          feed.name,
          feed.category,
          getFeedDailyCap(feed)
        );
        break;
      case "rss":
        if (!feed.url) throw new Error("feed.url is required for rss sources");
        items = await fetchRSS(feed.url, feed.id, feed.name, feed.category);
        break;
      default:
        items = [];
    }

    const normalizedItems = normalizeFeedItems(feed, items);
    console.log(
      `[coverage] ${feed.type} "${feed.name}" kept ${normalizedItems.length} items (cap ${getFeedDailyCap(feed)})`
    );
    return { items: normalizedItems, error: null };
  } catch (err) {
    console.error(`[coverage] ${feed.type} "${feed.name}" failed: ${(err as Error).message}`);
    return {
      items: [],
      error: {
        node: "fetchCoverage",
        message: `[${feed.name}] ${(err as Error).message}`,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
