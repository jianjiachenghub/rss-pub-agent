import { Annotation } from "@langchain/langgraph";
import type {
  PipelineConfig,
  PlatformConfig,
  RawNewsItem,
  GateKeepResult,
  ScoredNewsItem,
  NewsInsight,
  PlatformContents,
  PodcastData,
  PipelineError,
} from "./lib/types.js";

export const PipelineState = Annotation.Root({
  config: Annotation<PipelineConfig>,
  platformConfig: Annotation<PlatformConfig>,
  rawItems: Annotation<RawNewsItem[]>({
    reducer: (_, y) => y,
    default: () => [],
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
  insights: Annotation<NewsInsight[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  dailyMarkdown: Annotation<string>({
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
