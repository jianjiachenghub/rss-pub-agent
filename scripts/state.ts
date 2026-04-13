import { Annotation } from "@langchain/langgraph";
import type {
  PipelineConfig,
  PlatformConfig,
  RawNewsItem,
  GateKeepResult,
  ScoredNewsItem,
  NewsInsight,
  EventCandidate,
  PlatformContents,
  PodcastData,
  CoverageStats,
  EditorialAgenda,
  FetchCheckpoint,
  FetchMetrics,
  PipelineError,
} from "./lib/types.js";

// Most fields are "last write wins" because each stage materializes a fresh
// snapshot for the next node. Errors and token usage are the only accumulators.
export const PipelineState = Annotation.Root({
  config: Annotation<PipelineConfig>,
  platformConfig: Annotation<PlatformConfig>,
  rawItems: Annotation<RawNewsItem[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  primaryRawItems: Annotation<RawNewsItem[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  eventCandidates: Annotation<EventCandidate[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  coverageStats: Annotation<CoverageStats>({
    reducer: (_, y) => y,
    default: () => ({
      observedByCategory: {},
      selectedByCategory: {},
      finalByCategory: {},
      deficitCategories: [],
      totalObservedEvents: 0,
      totalSelectedEvents: 0,
    }),
  }),
  fetchCheckpoint: Annotation<FetchCheckpoint | null>({
    reducer: (_, y) => y,
    default: () => null,
  }),
  fetchMetrics: Annotation<FetchMetrics>({
    reducer: (_, y) => y,
    default: () => ({
      startedAt: "",
      primaryItemsFetched: 0,
      primaryItemsRetained: 0,
      eventCandidates: 0,
      rawCandidates: 0,
      backfillItemsFetched: 0,
      sourceErrors: 0,
      degradedMode: "none",
    }),
  }),
  gateKeepResults: Annotation<GateKeepResult[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  passedItems: Annotation<RawNewsItem[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  scoredItems: Annotation<ScoredNewsItem[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  secondaryItems: Annotation<ScoredNewsItem[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  editorialAgenda: Annotation<EditorialAgenda>({
    reducer: (_, y) => y,
    default: () => ({
      dominantNarrative: "",
      openingAngle: "",
      closingOutlookAngle: "",
      mustCoverThemes: [],
      watchSignals: [],
      mustCoverIds: [],
      categoryBoosts: {},
      rationale: "",
    }),
  }),
  insights: Annotation<NewsInsight[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  dailyMarkdown: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
  dailyMarkdownEn: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
  dailySummary: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
  podcast: Annotation<PodcastData>({
    reducer: (_, y) => y,
    default: () => ({ script: "" }),
  }),
  platformContents: Annotation<PlatformContents>({
    reducer: (_, y) => y,
    default: () => ({}),
  }),
  date: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
  errors: Annotation<PipelineError[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  tokenUsage: Annotation<number>({
    reducer: (x, y) => x + y,
    default: () => 0,
  }),
});

export type PipelineStateType = typeof PipelineState.State;
