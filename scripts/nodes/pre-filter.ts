import type { PipelineStateType } from "../state.js";
import { compressPrimaryItems } from "../lib/pre-filter.js";
import { writeRawJson } from "../lib/raw-output.js";

export async function preFilterNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { primaryRawItems, date, fetchMetrics } = state;
  if (!date) return {};

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
