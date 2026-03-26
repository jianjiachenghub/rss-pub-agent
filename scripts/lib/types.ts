// ===== Config Types =====

export type FeedTier = "core" | "signal" | "watch";

export interface FeedSource {
  id: string;
  type: "folo" | "folo-list" | "rss" | "api";
  url?: string;
  category: string;
  name: string;
  weight: number;
  listId?: string;
  // Source priority tier used by fetch governance.
  tier?: FeedTier;
  // Max number of 24h items this source can contribute to the raw candidate pool.
  dailyCap?: number;
  // When false, the source is treated as watchlist/fallback instead of main daily input.
  keepInMainPool?: boolean;
}

export interface UserInterest {
  topic: string;
  level: "must" | "high" | "medium" | "low";
  keywords: string[];
}

export interface PipelineConfig {
  feeds: FeedSource[];
  interests: UserInterest[];
  topN: number;
  language: "zh" | "en";
  outputStyle: "professional" | "casual";
}

export interface PlatformConfig {
  telegram: { enabled: boolean; botToken: string; chatId: string };
  wechat: { enabled: boolean; webhookUrl: string };
  xhs: { enabled: boolean; style: string };
  douyin: { enabled: boolean; style: string };
  podcast: { enabled: boolean; voices: string[]; maxMinutes: number };
}

// ===== Pipeline Data Types =====

export interface RawNewsItem {
  id: string;
  title: string;
  url: string;
  content: string;
  source: string;
  sourceId: string;
  category: string;
  publishedAt: string;
  fetchedAt: string;
}

export interface EventCandidate extends RawNewsItem {
  eventKey: string;
  normalizedTitle: string;
  duplicateCount: number;
  sourceCount: number;
  representativeSources: string[];
  preFilterScore: number;
}

export type FetchDegradeMode = "none" | "soft" | "hard";

export interface FetchCheckpoint {
  sourceId: string;
  listId?: string;
  publishedAfter: string | null;
  pagesFetched: number;
  pagesSucceeded: number;
  consecutiveFailures: number;
  stoppedReason: string;
  degradedMode: FetchDegradeMode;
  lastSuccessfulPublishedAt?: string;
  updatedAt: string;
}

export interface FetchMetrics {
  startedAt: string;
  finishedAt?: string;
  primaryItemsFetched: number;
  primaryItemsRetained: number;
  eventCandidates: number;
  rawCandidates: number;
  backfillItemsFetched: number;
  sourceErrors: number;
  degradedMode: FetchDegradeMode;
}

export interface CoverageStats {
  observedByCategory: Record<string, number>;
  selectedByCategory: Record<string, number>;
  finalByCategory: Record<string, number>;
  deficitCategories: string[];
  totalObservedEvents: number;
  totalSelectedEvents: number;
}

export interface GateKeepResult {
  id: string;
  action: "PASS" | "DROP" | "MERGE";
  mergeWith?: string;
  reason: string;
}

export interface ScoredNewsItem extends RawNewsItem {
  scores: {
    novelty: number;
    utility: number;
    impact: number;
    credibility: number;
    timeliness: number;
    uniqueness: number;
  };
  weightedScore: number;
  scoreReasoning: string;
}

export interface NewsInsight {
  id: string;
  title: string;
  url: string;
  source: string;
  category: string;
  publishedAt: string;
  oneLiner: string;
  content: string;
  imageUrl?: string;
  codeSnippet?: { lang: string; code: string };
  comparisonTable?: { headers: string[]; rows: string[][] };
  scores: ScoredNewsItem["scores"];
  weightedScore: number;
}

export interface PlatformContents {
  xhs?: string;
  douyin?: string;
  brief?: string;
}

export interface PodcastData {
  script: string;
  audioUrl?: string;
}

export interface PipelineError {
  node: string;
  message: string;
  timestamp: string;
}
