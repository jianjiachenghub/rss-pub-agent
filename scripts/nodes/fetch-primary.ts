import type { PipelineStateType } from "../state.js";
import { compareFeeds, dedupeRawItems } from "../lib/feed-fetch.js";
import { fetchFoloByListDetailed } from "../lib/folo.js";
import {
  rawSnapshotExists,
  readFetchCheckpoint,
  readFetchMetrics,
  readPrimaryRawItems,
} from "../lib/raw-input.js";
import { writeRawJson, writeRawJsonLines } from "../lib/raw-output.js";
import { shouldResumeFromRaw } from "../lib/runtime-options.js";
import type { FetchMetrics } from "../lib/types.js";

const PRIMARY_FETCH_SAFETY_MAX_ITEMS = 2500;

export async function fetchPrimaryNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { config, date } = state;
  if (!config || !date) {
    return {
      errors: [
        {
          node: "fetchPrimary",
          message: "Missing config or date",
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  const startedAt = new Date().toISOString();
  const metrics: FetchMetrics = {
    startedAt,
    primaryItemsFetched: 0,
    primaryItemsRetained: 0,
    eventCandidates: 0,
    rawCandidates: 0,
    backfillItemsFetched: 0,
    sourceErrors: 0,
    degradedMode: "none",
  };

  if (
    shouldResumeFromRaw(date) &&
    rawSnapshotExists(date, "folo-list.jsonl") &&
    rawSnapshotExists(date, "fetch-metrics.json")
  ) {
    try {
      const [primaryRawItems, cachedMetrics] = await Promise.all([
        readPrimaryRawItems(date),
        readFetchMetrics(date),
      ]);
      const fetchCheckpoint = rawSnapshotExists(date, "checkpoint.json")
        ? await readFetchCheckpoint(date)
        : null;

      console.log(
        `[fetchPrimary] Resumed ${primaryRawItems.length} items from content/${date}/raw/`
      );

      return {
        primaryRawItems,
        fetchCheckpoint,
        fetchMetrics: cachedMetrics,
      };
    } catch (err) {
      console.warn(
        `[fetchPrimary] Resume failed, falling back to fresh fetch: ${(err as Error).message}`
      );
    }
  }

  const primaryFeed = [...config.feeds]
    .filter((feed) => feed.type === "folo-list")
    .sort(compareFeeds)[0];

  if (!primaryFeed?.listId) {
    metrics.finishedAt = new Date().toISOString();
    return {
      primaryRawItems: [],
      fetchMetrics: metrics,
      errors: [
        {
          node: "fetchPrimary",
          message: "No folo-list feed configured for primary ingestion",
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  try {
    const result = await fetchFoloByListDetailed(
      process.env.FOLO_SESSION_TOKEN ?? "",
      primaryFeed.listId,
      primaryFeed.id,
      primaryFeed.name,
      primaryFeed.category,
      {
        maxItems: PRIMARY_FETCH_SAFETY_MAX_ITEMS,
        // Primary fetch only needs stable metadata for pre-filtering and dedupe. Pulling
        // full content here causes read-heavy Folo lists to return empty entry payloads.
        withContent: false,
        pageLimit: 100,
      }
    );

    const primaryRawItems = dedupeRawItems(result.items);
    metrics.primaryItemsFetched = result.items.length;
    metrics.primaryItemsRetained = primaryRawItems.length;
    metrics.degradedMode = result.checkpoint.degradedMode;
    metrics.finishedAt = new Date().toISOString();

    await Promise.all([
      writeRawJsonLines(date, "folo-list.jsonl", primaryRawItems),
      writeRawJson(date, "checkpoint.json", result.checkpoint),
      writeRawJson(date, "fetch-metrics.json", metrics),
    ]);

    console.log(
      `[fetchPrimary] ${primaryFeed.name} fetched ${result.items.length} items, ${primaryRawItems.length} after exact dedupe`
    );

    return {
      primaryRawItems,
      fetchCheckpoint: result.checkpoint,
      fetchMetrics: metrics,
    };
  } catch (err) {
    metrics.finishedAt = new Date().toISOString();
    metrics.degradedMode = "hard";
    metrics.sourceErrors = 1;

    await writeRawJson(date, "fetch-metrics.json", metrics);

    return {
      primaryRawItems: [],
      fetchMetrics: metrics,
      errors: [
        {
          node: "fetchPrimary",
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
