import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PipelineStateType } from "../state.js";
import { podcastSoloNode } from "./podcast-solo.js";

function state(overrides: Partial<PipelineStateType> = {}): PipelineStateType {
  return {
    date: "2026-10-27",
    dailyMarkdown: "# 完整日报\n\n## AI\n\n### 日报原文标题\n\n**事件：** 完整信息。\n\n评分 90 · 来源 原始信源",
    platformConfig: { podcast: { enabled: true } },
    insights: [{ title: "不应只读这个精选摘要" }],
    ...overrides,
  } as PipelineStateType;
}

describe("podcastSoloNode", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("uses the canonical daily report and writes an independent state field", async () => {
    const result = await podcastSoloNode(state());
    expect(result.podcastSoloScript).toContain("日报原文标题");
    expect(result.podcastSoloScript).toContain("完整信息。");
    expect(result.podcastSoloScript).toContain("评分是 90 分");
    expect(result.podcastSoloScript).not.toContain("不应只读这个精选摘要");
    expect(result).not.toHaveProperty("podcast");
    expect(result.errors).toBeUndefined();
  });

  it("skips when podcast output is disabled or daily content is missing", async () => {
    expect(await podcastSoloNode(state({ platformConfig: { podcast: { enabled: false } } } as Partial<PipelineStateType>)))
      .toEqual({ podcastSoloScript: "" });
    expect(await podcastSoloNode(state({ dailyMarkdown: "" })))
      .toEqual({ podcastSoloScript: "" });
  });

  it("records an isolated error without overwriting the existing podcast", async () => {
    const result = await podcastSoloNode(state({ date: "invalid" }));
    expect(result.podcastSoloScript).toBe("");
    expect(result.errors?.[0].node).toBe("podcastSolo");
    expect(result).not.toHaveProperty("podcast");
  });
});
