import type { PipelineStateType } from "../state.js";
import { fetchRSS } from "../lib/rss.js";
import { fetchViaFolo, fetchFoloByList } from "../lib/folo.js";
import type { RawNewsItem, PipelineError } from "../lib/types.js";

const CONCURRENCY = 5;
// 如果 folo-list 抓取到的新闻数量超过这个阈值，就不再抓取其他源
const FOLI_LIST_MIN_ITEMS = 50;

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

  // 第一步：优先抓取 folo-list 类型的新闻源
  const foloListFeeds = config.feeds.filter((feed) => feed.type === "folo-list");
  const otherFeeds = config.feeds.filter((feed) => feed.type !== "folo-list");

  console.log(`[fetch] Step 1: Fetching ${foloListFeeds.length} folo-list feeds...`);

  // 先抓取所有 folo-list 源
  const foloListTasks = foloListFeeds.map((feed) => async () => {
    try {
      const items = await fetchFoloByList(
        process.env.FOLO_SESSION_TOKEN ?? "",
        feed.listId ?? "",
        feed.id,
        feed.name,
        feed.category
      );
      console.log(`[fetch] Folo-list "${feed.name}" returned ${items.length} items`);
      return { items, error: null as PipelineError | null, feedName: feed.name };
    } catch (err) {
      console.error(`[fetch] Folo-list "${feed.name}" failed: ${(err as Error).message}`);
      return {
        items: [] as RawNewsItem[],
        error: {
          node: "fetch",
          message: `[${feed.name}] ${(err as Error).message}`,
          timestamp: new Date().toISOString(),
        } as PipelineError,
        feedName: feed.name,
      };
    }
  });

  const foloListResults = await runWithConcurrency(foloListTasks, CONCURRENCY);
  let foloListTotalItems = 0;

  for (const result of foloListResults) {
    results.push(...result.items);
    foloListTotalItems += result.items.length;
    if (result.error) errors.push(result.error);
  }

  console.log(`[fetch] Folo-list total: ${foloListTotalItems} items`);

  // 第二步：检查 folo-list 是否抓取到足够的新闻
  // 如果 folo-list 抓取成功且数量充足，跳过其他源的抓取
  if (foloListTotalItems >= FOLI_LIST_MIN_ITEMS) {
    console.log(`[fetch] Folo-list returned ${foloListTotalItems} items (>= ${FOLI_LIST_MIN_ITEMS}), skipping other feeds.`);
  } else {
    console.log(`[fetch] Step 2: Folo-list only returned ${foloListTotalItems} items (< ${FOLI_LIST_MIN_ITEMS}), fetching other feeds...`);

    // 抓取其他类型的源（folo 和 rss）
    const otherTasks = otherFeeds.map((feed) => async () => {
      try {
        let items: RawNewsItem[];
        switch (feed.type) {
          case "folo":
            items = await fetchViaFolo(feed.url, feed.id, feed.name, feed.category);
            break;
          case "rss":
            items = await fetchRSS(feed.url, feed.id, feed.name, feed.category);
            break;
          default:
            items = [];
        }
        console.log(`[fetch] ${feed.type} "${feed.name}" returned ${items.length} items`);
        return { items, error: null as PipelineError | null };
      } catch (err) {
        console.error(`[fetch] ${feed.type} "${feed.name}" failed: ${(err as Error).message}`);
        return {
          items: [] as RawNewsItem[],
          error: {
            node: "fetch",
            message: `[${feed.name}] ${(err as Error).message}`,
            timestamp: new Date().toISOString(),
          } as PipelineError,
        };
      }
    });

    const otherResults = await runWithConcurrency(otherTasks, CONCURRENCY);
    for (const result of otherResults) {
      results.push(...result.items);
      if (result.error) errors.push(result.error);
    }
  }

  // 去重
  const seen = new Set<string>();
  const deduped = results.filter((item) => {
    const key = item.url || item.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[fetch] Got ${results.length} items, ${deduped.length} after dedup, ${errors.length} source errors`);
  return { rawItems: deduped, errors };
}
