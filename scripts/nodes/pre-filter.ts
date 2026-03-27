import type { PipelineStateType } from "../state.js";
import { compressPrimaryItems } from "../lib/pre-filter.js";
import {
  rawSnapshotExists,
  readCoverageStats,
  readEventCandidates,
  readFetchMetrics,
} from "../lib/raw-input.js";
import { writeRawJson } from "../lib/raw-output.js";
import { shouldResumeFromRaw } from "../lib/runtime-options.js";

export async function preFilterNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { primaryRawItems, date, fetchMetrics } = state;
  if (!date) return {};

  if (
    shouldResumeFromRaw(date) &&
    rawSnapshotExists(date, "event-candidates.json") &&
    rawSnapshotExists(date, "coverage-stats.json")
  ) {
    try {
      const [eventCandidates, coverageStats, cachedMetrics] = await Promise.all([
        readEventCandidates(date),
        readCoverageStats(date),
        rawSnapshotExists(date, "fetch-metrics.json")
          ? readFetchMetrics(date)
          : Promise.resolve(fetchMetrics),
      ]);

      console.log(
        `[preFilter] Resumed ${eventCandidates.length} candidates from content/${date}/raw/`
      );

      return {
        eventCandidates,
        coverageStats,
        fetchMetrics: cachedMetrics,
      };
    } catch (err) {
      console.warn(
        `[preFilter] Resume failed, recomputing candidates: ${(err as Error).message}`
      );
    }
  }

  if (!primaryRawItems.length) {
    return {
      eventCandidates: [],
      coverageStats: {
        observedByCategory: {},
        selectedByCategory: {},
        finalByCategory: {},
        deficitCategories: [],
        totalObservedEvents: 0,
        totalSelectedEvents: 0,
      },
      fetchMetrics: {
        ...fetchMetrics,
        finishedAt: fetchMetrics.finishedAt ?? new Date().toISOString(),
      },
    };
  }

  try {
    const { observedEvents, selectedCandidates, coverageStats } =
      compressPrimaryItems(primaryRawItems);

    const nextMetrics = {
      ...fetchMetrics,
      eventCandidates: observedEvents.length,
      rawCandidates: selectedCandidates.length,
      finishedAt: fetchMetrics.finishedAt ?? new Date().toISOString(),
    };

    await Promise.all([
      writeRawJson(date, "event-candidates.json", selectedCandidates),
      writeRawJson(date, "coverage-stats.json", coverageStats),
      writeRawJson(date, "fetch-metrics.json", nextMetrics),
    ]);

    console.log(
      `[preFilter] ${primaryRawItems.length} raw items -> ${observedEvents.length} events -> ${selectedCandidates.length} candidates`
    );

    return {
      eventCandidates: selectedCandidates,
      coverageStats,
      fetchMetrics: nextMetrics,
    };
  } catch (err) {
    return {
      eventCandidates: [],
      errors: [
        {
          node: "preFilter",
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
