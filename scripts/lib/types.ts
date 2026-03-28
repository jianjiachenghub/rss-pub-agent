// ===== Config Types =====

export type FeedTier = "core" | "signal" | "watch";
export type NewsCategory =
  | "ai"
  | "tech"
  | "software"
  | "business"
  | "investment"
  | "politics"
  | "social";

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

export interface EditorialStrategyConfig {
  positioning: string;
  dailyObjective: string;
  baseCategoryWeights: Partial<Record<NewsCategory, number>>;
  minimumCategoryCoverage: Partial<Record<NewsCategory, number>>;
  scoringWeights: {
    signalStrength: number;
    futureImpact: number;
    personalRelevance: number;
    decisionUsefulness: number;
    credibility: number;
    timeliness: number;
  };
  mustWatchThemes: string[];
  selectionPrinciples: string[];
}

export interface PipelineConfig {
  feeds: FeedSource[];
  interests: UserInterest[];
  topN: number;
  language: "zh" | "en";
  outputStyle: "professional" | "casual";
  reportName?: string;
  editorial: EditorialStrategyConfig;
}

export interface FeishuPlatformConfig {
  enabled: boolean;
  webhookUrl: string;
  maxHighlights?: number;
  targetName?: string;
}

export interface PlatformConfig {
  reportBaseUrl?: string;
  telegram: { enabled: boolean; botToken: string; chatId: string };
  wechat: { enabled: boolean; webhookUrl: string };
  feishu?: FeishuPlatformConfig;
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
  summary?: string;
  source: string;
  sourceId: string;
  category: string;
  publishedAt: string;
  fetchedAt: string;
  imageUrl?: string;
  contentSource?: "summary" | "page";
  contentDepth?: number;
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

export interface EditorialAgenda {
  dominantNarrative: string;
  openingAngle: string;
  closingOutlookAngle: string;
  mustCoverThemes: string[];
  watchSignals: string[];
  mustCoverIds: string[];
  categoryBoosts: Partial<Record<NewsCategory, number>>;
  rationale: string;
}

export interface GateKeepResult {
  id: string;
  action: "PASS" | "DROP" | "MERGE";
  mergeWith?: string;
  reason: string;
}

export interface ScoringDimensions {
  signalStrength: number;
  futureImpact: number;
  personalRelevance: number;
  decisionUsefulness: number;
  credibility: number;
  timeliness: number;
}

export interface ScoredNewsItem extends RawNewsItem {
  scores: ScoringDimensions;
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
  event: string;
  interpretation?: string;
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

export type DeliveryStatus = "pending" | "sent" | "failed" | "skipped";

export interface DeliveryRecord {
  date: string;
  channel: "feishu";
  target: string;
  status: DeliveryStatus;
  attempts: number;
  summaryPreview?: string;
  url?: string;
  sentAt?: string;
  externalId?: string;
  lastError?: string;
}

export interface PipelineError {
  node: string;
  message: string;
  timestamp: string;
}
