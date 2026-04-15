import type { PipelineStateType } from "../state.js";
import { fetchRSS } from "../lib/rss.js";
import { fetchViaFolo, fetchFoloByList } from "../lib/folo.js";
import type {
  FeedSource,
  FeedTier,
  RawNewsItem,
  PipelineError,
} from "../lib/types.js";
import { isTimestampInBusinessDate } from "../lib/business-date.js";
import { getTargetDate } from "../lib/runtime-options.js";

const CONCURRENCY = 5;
const MIN_MAIN_POOL_ITEMS = 60;
const GLOBAL_RAW_CAP = 140;

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

const CATEGORY_RAW_CAP: Record<string, number> = {
  ai: 45,
  tech: 20,
  software: 18,
  business: 18,
  investment: 28,
  politics: 14,
  social: 10,
};

async function runWithConcurrency<T>(
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

function getFeedTier(feed: FeedSource): FeedTier {
  if (feed.tier) return feed.tier;
  return feed.keepInMainPool === false ? "watch" : "signal";
}

function shouldKeepInMainPool(feed: FeedSource): boolean {
  // `watch` feeds stay out of the main daily pool unless the core/signal pool is too thin.
  return feed.keepInMainPool !== false && getFeedTier(feed) !== "watch";
}

function getFeedDailyCap(feed: FeedSource): number {
  const cap = feed.dailyCap ?? DEFAULT_DAILY_CAP_BY_TIER[getFeedTier(feed)];
  return Math.max(1, cap);
}

function getPublishedTime(publishedAt?: string): number {
  if (!publishedAt) return 0;
  const time = new Date(publishedAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isTargetDateItem(
  item: RawNewsItem,
  targetDate = getTargetDate()
): boolean {
  if (!item.publishedAt) return true;
  return isTimestampInBusinessDate(item.publishedAt, targetDate);
}

function normalizeFeedItems(feed: FeedSource, items: RawNewsItem[]): RawNewsItem[] {
  const targetDate = getTargetDate();
  // Every source is normalized the same way: exact target-day filter -> newest first -> source cap.
  return items
    .filter((item) => isTargetDateItem(item, targetDate))
    .sort((a, b) => getPublishedTime(b.publishedAt) - getPublishedTime(a.publishedAt))
    .slice(0, getFeedDailyCap(feed));
}

function dedupeItems(items: RawNewsItem[]): RawNewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.url || `${item.sourceId}:${item.title}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function applyCategoryCaps(items: RawNewsItem[]): RawNewsItem[] {
  const counts = new Map<string, number>();
  const selected: RawNewsItem[] = [];

  for (const item of items) {
    // Raw-stage category caps keep a single topic from consuming the whole daily candidate budget.
    if (selected.length >= GLOBAL_RAW_CAP) break;

    const category = item.category || "social";
    const limit = CATEGORY_RAW_CAP[category] ?? 10;
    const current = counts.get(category) ?? 0;

    if (current >= limit) continue;

    counts.set(category, current + 1);
    selected.push(item);
  }

  return selected;
}

function summarizeCategoryCounts(items: RawNewsItem[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const category = item.category || "social";
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return Object.fromEntries(counts);
}

function finalizeItems(items: RawNewsItem[]): RawNewsItem[] {
  // Cross-source governance happens here after all fetches complete.
  const sorted = [...items].sort(
    (a, b) => getPublishedTime(b.publishedAt) - getPublishedTime(a.publishedAt)
  );
  const deduped = dedupeItems(sorted);
  return applyCategoryCaps(deduped);
}

function compareFeeds(a: FeedSource, b: FeedSource): number {
  const tierDiff = TIER_PRIORITY[getFeedTier(a)] - TIER_PRIORITY[getFeedTier(b)];
  if (tierDiff !== 0) return tierDiff;
  return b.weight - a.weight;
}

async function fetchSingleFeed(
  feed: FeedSource
): Promise<{ items: RawNewsItem[]; error: PipelineError | null }> {
  try {
    const cap = getFeedDailyCap(feed);
    let items: RawNewsItem[];

    switch (feed.type) {
      case "folo-list":
        items = await fetchFoloByList(
          process.env.FOLO_SESSION_TOKEN ?? "",
          feed.listId ?? "",
          feed.id,
          feed.name,
          feed.category,
          cap
        );
        break;
      case "folo":
        if (!feed.url) throw new Error("feed.url is required for folo sources");
        items = await fetchViaFolo(feed.url, feed.id, feed.name, feed.category, cap);
        break;
      case "rss":
        if (!feed.url) throw new Error("feed.url is required for rss sources");
        items = await fetchRSS(feed.url, feed.id, feed.name, feed.category);
        break;
      default:
        items = [];
    }

    const normalizedItems = normalizeFeedItems(feed, items);
    const scope = shouldKeepInMainPool(feed) ? "main" : "watch";
    console.log(
      `[fetch] ${scope}/${getFeedTier(feed)} ${feed.type} "${feed.name}" kept ${normalizedItems.length} items (cap ${cap})`
    );
    return { items: normalizedItems, error: null };
  } catch (err) {
    console.error(`[fetch] ${feed.type} "${feed.name}" failed: ${(err as Error).message}`);
    return {
      items: [],
      error: {
        node: "fetch",
        message: `[${feed.name}] ${(err as Error).message}`,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export async function fetchNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { config } = state;
  if (!config) {
    return {
      errors: [{ node: "fetch", message: "No config loaded", timestamp: new Date().toISOString() }],
    };
  }

  const results: RawNewsItem[] = [];
  const errors: PipelineError[] = [];

  const orderedFeeds = [...config.feeds].sort(compareFeeds);
  // Core/signal feeds define the main daily input; watch feeds are only used as low-priority backfill.
  const mainPoolFeeds = orderedFeeds.filter(shouldKeepInMainPool);
  const watchFeeds = orderedFeeds.filter((feed) => !shouldKeepInMainPool(feed));

  console.log(
    `[fetch] Main pool feeds: ${mainPoolFeeds.length}, watch feeds: ${watchFeeds.length}`
  );

  const mainPoolTasks = mainPoolFeeds.map((feed) => async () => fetchSingleFeed(feed));
  const mainPoolResults = await runWithConcurrency(mainPoolTasks, CONCURRENCY);

  for (const result of mainPoolResults) {
    results.push(...result.items);
    if (result.error) errors.push(result.error);
  }

  // Finalize once before backfill so we can decide whether the main pool is already healthy enough.
  let finalItems = finalizeItems(results);

  console.log(
    `[fetch] Main pool produced ${finalItems.length} items after dedupe/caps`
  );
  console.log(`[fetch] Main pool category distribution:`, summarizeCategoryCounts(finalItems));

  if (finalItems.length < MIN_MAIN_POOL_ITEMS && watchFeeds.length > 0) {
    console.log(
      `[fetch] Main pool below threshold (${finalItems.length} < ${MIN_MAIN_POOL_ITEMS}), backfilling from watch feeds...`
    );

    const watchTasks = watchFeeds.map((feed) => async () => fetchSingleFeed(feed));
    const watchResults = await runWithConcurrency(watchTasks, CONCURRENCY);

    for (const result of watchResults) {
      results.push(...result.items);
      if (result.error) errors.push(result.error);
    }

    finalItems = finalizeItems(results);
    console.log(
      `[fetch] After watch backfill: ${finalItems.length} items after dedupe/caps`
    );
    console.log(`[fetch] Final category distribution:`, summarizeCategoryCounts(finalItems));
  } else if (watchFeeds.length > 0) {
    console.log(`[fetch] Skipping watch feeds because main pool is sufficient.`);
  }

  console.log(
    `[fetch] Got ${results.length} raw items, kept ${finalItems.length} after governance, ${errors.length} source errors`
  );
  return { rawItems: finalItems, errors };
}
