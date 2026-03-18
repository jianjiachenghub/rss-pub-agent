import type { PipelineStateType } from "../state.js";
import { fetchRSS } from "../lib/rss.js";
import { fetchViaFolo, fetchFoloByList } from "../lib/folo.js";
import type { RawNewsItem, PipelineError } from "../lib/types.js";

const CONCURRENCY = 5;

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

  const tasks = config.feeds.map((feed) => async () => {
    try {
      let items: RawNewsItem[];
      switch (feed.type) {
        case "folo":
          // 通过 Folo API 拉取 RSS（不需要认证，Folo 帮解析+缓存+摘要）
          items = await fetchViaFolo(feed.url, feed.id, feed.name, feed.category);
          break;
        case "folo-list":
          // 按 Folo 列表拉取（需要 session token）
          items = await fetchFoloByList(
            process.env.FOLO_SESSION_TOKEN ?? "",
            feed.listId ?? "",
            feed.id,
            feed.name,
            feed.category
          );
          break;
        case "rss":
          // 直连 RSS（备用方案）
          items = await fetchRSS(feed.url, feed.id, feed.name, feed.category);
          break;
        default:
          items = [];
      }
      return { items, error: null as PipelineError | null };
    } catch (err) {
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

  const settled = await runWithConcurrency(tasks, CONCURRENCY);
  for (const result of settled) {
    results.push(...result.items);
    if (result.error) errors.push(result.error);
  }

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
