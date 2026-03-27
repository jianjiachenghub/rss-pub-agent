import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/llm.js", () => ({
  callLLMJson: vi.fn(),
  isContentSafetyError: vi.fn(),
}));

import { callLLMJson, isContentSafetyError } from "../lib/llm.js";
import type { PipelineStateType } from "../state.js";
import type {
  EditorialAgenda,
  PipelineConfig,
  RawNewsItem,
} from "../lib/types.js";
import { gateKeepNode } from "./gate-keep.js";
import { scoreNode } from "./score.js";

const mockedCallLLMJson = vi.mocked(callLLMJson);
const mockedIsContentSafetyError = vi.mocked(isContentSafetyError);

const config: PipelineConfig = {
  feeds: [
    {
      id: "folo-list",
      type: "folo-list",
      listId: "demo-list",
      category: "ai",
      name: "Follow AI 列表",
      weight: 85,
      tier: "signal",
      keepInMainPool: true,
    },
    {
      id: "forum",
      type: "rss",
      url: "https://example.com/forum.xml",
      category: "social",
      name: "Forum",
      weight: 35,
      tier: "watch",
      keepInMainPool: false,
    },
  ],
  interests: [
    { topic: "AI", level: "must", keywords: ["agent", "model", "openai"] },
    { topic: "Investment", level: "high", keywords: ["earnings", "allocation"] },
  ],
  topN: 2,
  language: "zh",
  outputStyle: "professional",
  editorial: {
    positioning: "multi-category personal daily",
    dailyObjective: "find the highest-value signals of the day",
    baseCategoryWeights: {
      ai: 1,
      investment: 0.95,
      business: 0.8,
      software: 0.75,
      tech: 0.7,
      politics: 0.65,
      social: 0.4,
    },
    minimumCategoryCoverage: {
      ai: 1,
      investment: 1,
    },
    scoringWeights: {
      signalStrength: 0.25,
      futureImpact: 0.25,
      personalRelevance: 0.2,
      decisionUsefulness: 0.15,
      credibility: 0.1,
      timeliness: 0.05,
    },
    mustWatchThemes: ["AI infra", "capital allocation"],
    selectionPrinciples: ["prioritize signal over chatter"],
  },
};

const editorialAgenda: EditorialAgenda = {
  dominantNarrative: "Capital and compute continue to drive the AI cycle.",
  openingAngle: "Look for the few developments that change positioning.",
  closingOutlookAngle: "Watch what alters budgets, policy, or deployment timing.",
  mustCoverThemes: ["AI infra", "earnings"],
  watchSignals: ["GPU supply", "policy shifts"],
  mustCoverIds: ["item-1"],
  categoryBoosts: {
    ai: 0.25,
    investment: 0.2,
  },
  rationale: "AI and investment stay highest priority unless a larger macro shock lands.",
};

function makeItem(
  id: string,
  overrides: Partial<RawNewsItem> = {}
): RawNewsItem {
  return {
    id,
    title: `Title ${id}`,
    url: `https://example.com/${id}`,
    content:
      "OpenAI released a new agent workflow and investors are reassessing compute allocation.",
    source: "OpenAI Blog",
    sourceId: "folo-list-openai",
    category: "ai",
    publishedAt: "2026-03-27T08:00:00.000Z",
    fetchedAt: "2026-03-27T08:05:00.000Z",
    ...overrides,
  };
}

function makeState(
  overrides: Partial<PipelineStateType> = {}
): PipelineStateType {
  return {
    rawItems: [],
    passedItems: [],
    config,
    editorialAgenda,
    errors: [],
    ...overrides,
  } as PipelineStateType;
}

describe("content safety fallbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses heuristic gate-keep results when the provider blocks on moderation", async () => {
    const rawItems = [
      makeItem("item-1", { title: "OpenAI ships agent roadmap for enterprise workflows" }),
      makeItem("item-2", { title: "GPU supply chain update changes cloud pricing outlook" }),
      makeItem("item-3", { title: "Major AI funding round signals new model race" }),
      makeItem("item-4", { title: "Chip export policy may reshape model deployment" }),
      makeItem("item-5", { title: "Security breach hits a leading infrastructure vendor" }),
      makeItem("item-6", { title: "Benchmark release redraws inference economics" }),
      makeItem("item-7", { title: "Open source agent stack adds enterprise controls" }),
      makeItem("item-8", {
        title: "What's the difference between two CSS tricks?",
        content: "Short post.",
        source: "Forum",
        sourceId: "forum-thread-8",
        category: "social",
      }),
    ];

    mockedCallLLMJson.mockRejectedValue(new Error("1301 不安全或敏感内容"));
    mockedIsContentSafetyError.mockReturnValue(true);

    const result = await gateKeepNode(makeState({ rawItems }));

    expect(mockedCallLLMJson).toHaveBeenCalledTimes(1);
    expect(mockedIsContentSafetyError).toHaveBeenCalledTimes(1);
    expect(result.errors?.[0]?.node).toBe("gateKeep");
    expect(result.gateKeepResults).toHaveLength(rawItems.length);
    expect(result.passedItems?.length).toBeGreaterThan(0);
    expect(
      result.gateKeepResults?.every((item) =>
        item.reason.startsWith("Fallback heuristic")
      )
    ).toBe(true);
  });

  it("uses heuristic scores instead of flat defaults on moderation blocks", async () => {
    const passedItems = [
      makeItem("item-1", { title: "OpenAI ships agent roadmap for enterprise workflows" }),
      makeItem("item-2", {
        title: "Chip earnings point to a new AI capex cycle",
        category: "investment",
        source: "Financial Times",
        sourceId: "folo-list-ft",
      }),
      makeItem("item-3", {
        title: "New framework release improves agent debugging",
        category: "software",
        source: "GitHub Blog",
        sourceId: "folo-list-github",
      }),
    ];

    mockedCallLLMJson.mockRejectedValue(new Error("1301 不安全或敏感内容"));
    mockedIsContentSafetyError.mockReturnValue(true);

    const result = await scoreNode(makeState({ passedItems }));

    expect(mockedCallLLMJson).toHaveBeenCalledTimes(1);
    expect(mockedIsContentSafetyError).toHaveBeenCalledTimes(1);
    expect(result.errors?.[0]?.node).toBe("score");
    expect(result.scoredItems).toHaveLength(config.topN);
    expect(
      result.scoredItems?.every(
        (item) => item.scoreReasoning === "Fallback heuristic score"
      )
    ).toBe(true);
    expect(result.secondaryItems).toBeDefined();
  });
});
