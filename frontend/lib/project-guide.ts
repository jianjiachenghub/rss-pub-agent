import "server-only";

import { readFileSync } from "fs";
import { join } from "path";

type FeedTier = "core" | "signal" | "watch";
type FeedCategory =
  | "ai"
  | "tech"
  | "software"
  | "business"
  | "investment"
  | "politics"
  | "social";

interface FeedSource {
  id: string;
  type: "folo" | "folo-list" | "rss" | "api";
  url?: string;
  category: FeedCategory;
  name: string;
  weight: number;
  tier?: FeedTier;
  dailyCap?: number;
  keepInMainPool?: boolean;
}

interface FeedConfigFile {
  feeds: FeedSource[];
}

interface PromptConfigFile {
  reportName?: string;
  topN: number;
  interests: Array<{
    topic: string;
    level: "must" | "high" | "medium" | "low";
    keywords: string[];
  }>;
  editorial: {
    baseCategoryWeights: Partial<Record<FeedCategory, number>>;
    minimumCategoryCoverage: Partial<Record<FeedCategory, number>>;
    scoringWeights: Record<
      | "signalStrength"
      | "futureImpact"
      | "personalRelevance"
      | "decisionUsefulness"
      | "credibility"
      | "timeliness",
      number
    >;
    mustWatchThemes: string[];
    selectionPrinciples: string[];
    dailyObjective: string;
  };
}

interface SourceGroup {
  category: FeedCategory;
  label: string;
  description: string;
  feeds: Array<{
    name: string;
    tier: FeedTier;
    weight: number;
    dailyCap?: number;
    isMainPool: boolean;
  }>;
}

interface AboutMetric {
  label: string;
  value: string;
}

interface ScoreDimension {
  key: keyof PromptConfigFile["editorial"]["scoringWeights"];
  label: string;
  weight: number;
  description: string;
}

interface PipelineStep {
  title: string;
  description: string;
  bullets: string[];
}

const CONFIG_DIR = join(process.cwd(), "../configs");

const CATEGORY_COPY: Record<FeedCategory, { label: string; description: string }> = {
  ai: {
    label: "AI",
    description: "模型、产品形态、研究进展和行业动态的高优先级信号池。",
  },
  tech: {
    label: "科技",
    description: "大公司、基础设施、消费科技和平台格局的外部变量。",
  },
  software: {
    label: "软件工程",
    description: "开发者工具、开源、框架和工程效率变化。",
  },
  business: {
    label: "商业",
    description: "公司战略、财报、市场结构和产业链变化。",
  },
  investment: {
    label: "投资",
    description: "资金流向、风险偏好和市场定价相关的信息。",
  },
  politics: {
    label: "政策",
    description: "监管、地缘、出口限制和制度性变量。",
  },
  social: {
    label: "社会",
    description: "热榜、舆论和公共事件，用于补充观察而不是主导日报。",
  },
};

const SCORE_DIMENSION_COPY: Record<ScoreDimension["key"], { label: string; description: string }> = {
  signalStrength: {
    label: "信号强度",
    description: "判断它是不是会改变你对行业或市场走势的看法。",
  },
  futureImpact: {
    label: "未来影响",
    description: "关注这条信息能影响未来几天到几周，而不是只在今天热闹。",
  },
  personalRelevance: {
    label: "个人相关度",
    description: "是否与 AI、产品、研发、投资这些核心关注面直接相关。",
  },
  decisionUsefulness: {
    label: "决策价值",
    description: "能不能帮助后续行动，例如继续跟踪、建立假设或修正判断。",
  },
  credibility: {
    label: "可信度",
    description: "来源质量、信息完整度和可验证性。",
  },
  timeliness: {
    label: "时效性",
    description: "过去 24 小时内的优先级，以及对当期日报的必要性。",
  },
};

function readJsonFile<T>(fileName: string): T {
  return JSON.parse(readFileSync(join(CONFIG_DIR, fileName), "utf-8")) as T;
}

function getTierCounts(feeds: FeedSource[]) {
  return feeds.reduce(
    (acc, feed) => {
      const tier = feed.tier ?? "signal";
      acc[tier] += 1;
      return acc;
    },
    { core: 0, signal: 0, watch: 0 }
  );
}

function getSourceGroups(feeds: FeedSource[]): SourceGroup[] {
  const categories: FeedCategory[] = [
    "ai",
    "tech",
    "software",
    "business",
    "politics",
    "social",
  ];

  return categories
    .map((category) => {
      const categoryFeeds = feeds
        .filter((feed) => feed.category === category)
        .sort((left, right) => right.weight - left.weight)
        .map((feed) => ({
          name: feed.name,
          tier: feed.tier ?? "signal",
          weight: feed.weight,
          dailyCap: feed.dailyCap,
          isMainPool: feed.keepInMainPool !== false,
        }));

      return {
        category,
        label: CATEGORY_COPY[category].label,
        description: CATEGORY_COPY[category].description,
        feeds: categoryFeeds,
      };
    })
    .filter((group) => group.feeds.length > 0);
}

function getScoreDimensions(promptConfig: PromptConfigFile): ScoreDimension[] {
  return Object.entries(promptConfig.editorial.scoringWeights).map(([key, weight]) => ({
    key: key as ScoreDimension["key"],
    label: SCORE_DIMENSION_COPY[key as ScoreDimension["key"]].label,
    weight,
    description: SCORE_DIMENSION_COPY[key as ScoreDimension["key"]].description,
  }));
}

export function getProjectGuideData() {
  const feedConfig = readJsonFile<FeedConfigFile>("feeds.json");
  const promptConfig = readJsonFile<PromptConfigFile>("prompt.json");
  const feeds = feedConfig.feeds;
  const tierCounts = getTierCounts(feeds);
  const sourceGroups = getSourceGroups(feeds);
  const mainPoolSources = feeds.filter((feed) => feed.keepInMainPool !== false).length;
  const watchOnlySources = feeds.filter((feed) => feed.keepInMainPool === false).length;

  const scoreDimensions = getScoreDimensions(promptConfig);
  const categoryWeights = Object.entries(promptConfig.editorial.baseCategoryWeights)
    .filter((entry): entry is [FeedCategory, number] => typeof entry[1] === "number")
    .sort((left, right) => right[1] - left[1])
    .map(([category, weight]) => ({
      category,
      label: CATEGORY_COPY[category].label,
      weight,
      minimumCoverage: promptConfig.editorial.minimumCategoryCoverage[category] ?? 0,
    }));

  const metrics: AboutMetric[] = [
    { label: "已配置信源", value: `${feeds.length}` },
    { label: "主输入源", value: `${mainPoolSources}` },
    { label: "观察源", value: `${watchOnlySources}` },
    { label: "日报主池上限", value: `${promptConfig.topN}` },
  ];

  const pipelineSteps: PipelineStep[] = [
    {
      title: "1. 抓取与预筛",
      description: "先从 feeds 配置里抓当天原始内容，再把明显重复和碎片化事件压成候选池。",
      bullets: [
        "`fetchPrimary` 先抓核心源和主输入源，保留过去 24 小时的原始条目。",
        "`preFilter` 会把相似标题压成 observed events，再挑出代表性候选。",
        "每个信源都带 `tier`、`weight`、`dailyCap`，控制优先级和单源注水问题。",
      ],
    },
    {
      title: "2. 覆盖补全与编务议程",
      description: "如果某些类别当天信息不足，系统会主动补抓，避免日报被单一领域淹没。",
      bullets: [
        "`fetchCoverage` 根据 deficit categories 回补类别，保证多类别覆盖。",
        "`editorialAgenda` 从候选池里生成当天主线、必须覆盖主题、观察信号和 category boost。",
        "这一步决定当天日报更像哪一版编辑手稿，而不是纯按热度排序。",
      ],
    },
    {
      title: "3. Gate-Keep 与打分",
      description: "先做去噪和合并，再做多维度评分，尽量把真正有判断价值的条目留下来。",
      bullets: [
        "`gateKeep` 会批量让模型输出 PASS / DROP / MERGE，内容安全触发时退回启发式过滤。",
        "`score` 对每条通过条目做 6 维打分，并叠加类目权重、当日 boost、must-cover bonus。",
        "最终会保住最小分类覆盖，并限制单一类别过度挤占日报版面。",
      ],
    },
    {
      title: "4. 聚合生成与分发",
      description: "高分条目继续做结构化解读，再生成日报、播客和平台分发内容。",
      bullets: [
        "`insight` 把标题变成 one-liner / event / interpretation，筛出真正值得深挖的 deep dives。",
        "`generateDaily` 按分类写成 Markdown 日报，保留更多 24h 候选池和后续观察变量。",
        "`podcastGen`、`platformsGen`、`publish`、`notify` 负责播客脚本、平台内容、发布和通知。",
      ],
    },
  ];

  return {
    metrics,
    tierCounts,
    sourceGroups,
    scoreDimensions,
    categoryWeights,
    pipelineSteps,
    selectionPrinciples: promptConfig.editorial.selectionPrinciples,
    mustWatchThemes: promptConfig.editorial.mustWatchThemes,
    interests: promptConfig.interests,
    dailyObjective: promptConfig.editorial.dailyObjective,
  };
}
