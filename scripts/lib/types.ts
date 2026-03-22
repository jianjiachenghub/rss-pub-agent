// ===== Config Types =====

export interface FeedSource {
  id: string;
  type: "folo" | "folo-list" | "rss" | "api";
  url: string;
  category: string;
  name: string;
  weight: number;
  listId?: string;
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
