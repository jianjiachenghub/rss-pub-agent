import type { PipelineStateType } from "../state.js";
import {
  FETCH_CONCURRENCY,
  compareFeeds,
  fetchSingleFeed,
  finalizeRawCandidates,
  isMainPoolFeed,
  runWithConcurrency,
  summarizeCategoryCounts,
} from "../lib/feed-fetch.js";
import { COVERAGE_MIN_TARGETS } from "../lib/pre-filter.js";
import { writeRawJson } from "../lib/raw-output.js";

export async function fetchCoverageNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { config, eventCandidates, coverageStats, date, fetchMetrics } = state;
  if (!config || !date) {
    return {
      errors: [
        {
          node: "fetchCoverage",
          message: "Missing config or date",
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  if (!eventCandidates.length) {
    return { rawItems: [] };
  }

  try {
    const deficits =
      coverageStats.deficitCategories.length > 0
        ? coverageStats.deficitCategories
        : Object.entries(COVERAGE_MIN_TARGETS)
            .filter(([category, min]) => (coverageStats.selectedByCategory[category] ?? 0) < min)
            .map(([category]) => category);

    const coverageFeeds = [...config.feeds]
      .filter((feed) => feed.type !== "folo-list")
      .filter(isMainPoolFeed)
      .filter((feed) => deficits.includes(feed.category))
      .sort(compareFeeds);

    const errors = [];
    const coverageItems = [];

    if (coverageFeeds.length > 0) {
      const tasks = coverageFeeds.map((feed) => async () => fetchSingleFeed(feed));
      const results = await runWithConcurrency(tasks, FETCH_CONCURRENCY);

      for (const result of results) {
        coverageItems.push(...result.items);
        if (result.error) errors.push(result.error);
      }
    }

    const rawItems = finalizeRawCandidates([...eventCandidates, ...coverageItems]);
    const finalByCategory = summarizeCategoryCounts(rawItems);
    const remainingDeficits = Object.entries(COVERAGE_MIN_TARGETS)
      .filter(([category, min]) => (finalByCategory[category] ?? 0) < min)
      .map(([category]) => category);

    const nextCoverageStats = {
      ...coverageStats,
      finalByCategory,
      deficitCategories: remainingDeficits,
    };

    const nextMetrics = {
      ...fetchMetrics,
      rawCandidates: rawItems.length,
      backfillItemsFetched: coverageItems.length,
      sourceErrors: fetchMetrics.sourceErrors + errors.length,
      finishedAt: new Date().toISOString(),
    };

    await Promise.all([
      writeRawJson(date, "raw-candidates.json", rawItems),
      writeRawJson(date, "coverage-stats.json", nextCoverageStats),
      writeRawJson(date, "fetch-metrics.json", nextMetrics),
    ]);

    console.log(
      `[fetchCoverage] deficits=${deficits.join(",") || "none"} coverageFeeds=${coverageFeeds.length} backfillItems=${coverageItems.length} finalRaw=${rawItems.length}`
    );

    return {
      rawItems,
      coverageStats: nextCoverageStats,
      fetchMetrics: nextMetrics,
      errors,
    };
  } catch (err) {
    return {
      errors: [
        {
          node: "fetchCoverage",
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
