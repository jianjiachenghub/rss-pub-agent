import type { PipelineStateType } from "../state.js";
import { fetchRSS } from "../lib/rss.js";
import { fetchFolo } from "../lib/folo.js";
import type { RawNewsItem, PipelineError } from "../lib/types.js";

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

  const promises = config.feeds.map(async (feed) => {
    try {
      let items: RawNewsItem[];
      switch (feed.type) {
        case "rss":
          items = await fetchRSS(feed.url, feed.id, feed.name, feed.category);
          break;
        case "folo":
          items = await fetchFolo(
            process.env.FOLO_SESSION_TOKEN ?? "",
            feed.id,
            feed.name,
            feed.category
          );
          break;
        default:
          items = [];
      }
      return { items, error: null };
    } catch (err) {
      return {
        items: [] as RawNewsItem[],
        error: {
          node: "fetch",
          message: `[${feed.name}] ${(err as Error).message}`,
          timestamp: new Date().toISOString(),
        },
      };
    }
  });

  const settled = await Promise.all(promises);
  for (const result of settled) {
    results.push(...result.items);
    if (result.error) errors.push(result.error);
  }

  const seen = new Set<string>();
  const deduped = results.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  console.log(`[fetch] Got ${results.length} items, ${deduped.length} after dedup, ${errors.length} source errors`);
  return { rawItems: deduped, errors };
}
