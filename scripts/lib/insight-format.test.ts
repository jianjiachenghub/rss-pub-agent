import { describe, expect, it } from "vitest";
import {
  buildFallbackSections,
  buildInsightContent,
  computeDailyInsightTarget,
  getInvalidInsightFields,
  hasThinContent,
  isInformativeImage,
  shouldWriteInterpretation,
} from "./insight-format.js";

describe("insight-format", () => {
  it("builds compatibility content from event and interpretation", () => {
    expect(
      buildInsightContent({
        event: "苹果计划在 iOS 27 向第三方 AI 助手开放 Siri 接口。",
        interpretation:
          "这会把竞争重点从模型单点能力转到系统入口、调用频率和默认分发位置。",
      })
    ).toContain("解读：这会把竞争重点从模型单点能力转到系统入口");
  });

  it("flags generic or non-Chinese insight fields as invalid", () => {
    expect(
      getInvalidInsightFields("苹果开放 Siri 接口", {
        event:
          "The company announced a new change to Siri that may impact the market.",
        interpretation: "值得关注后续进展。",
      })
    ).toEqual(["event", "interpretation"]);
  });

  it("treats short forum questions as not suitable for interpretation", () => {
    const item = {
      title: "请问什么工具可以测数据库 C 接口的性能，以及稳定性？",
      source: "V2EX - 技术",
      content:
        "The user asks what tools can be used to test the performance and stability of an embedded database’s C API.",
      contentDepth: 104,
    };

    expect(hasThinContent(item)).toBe(true);
    expect(shouldWriteInterpretation(item)).toBe(false);
  });

  it("keeps only informative image candidates", () => {
    expect(
      isInformativeImage(
        "https://example.com/assets/model-leaderboard-chart.png",
        "这篇文章给出了模型梯队和 benchmark 对比。"
      )
    ).toBe(true);

    expect(
      isInformativeImage(
        "https://example.com/assets/company-logo.png",
        "这是一篇公司新闻。"
      )
    ).toBe(false);
  });

  it("computes a dynamic deep-dive target from score distribution", () => {
    expect(
      computeDailyInsightTarget(18, [
        { weightedScore: 82 },
        { weightedScore: 80 },
        { weightedScore: 79 },
        { weightedScore: 78 },
        { weightedScore: 77 },
        { weightedScore: 76 },
        { weightedScore: 75 },
        { weightedScore: 74 },
        { weightedScore: 74 },
        { weightedScore: 73 },
        { weightedScore: 72 },
        { weightedScore: 71 },
        { weightedScore: 70 },
        { weightedScore: 69 },
        { weightedScore: 69 },
        { weightedScore: 68 },
        { weightedScore: 68 },
        { weightedScore: 68 },
        { weightedScore: 68 },
        { weightedScore: 68 },
      ])
    ).toBe(20);

    expect(
      computeDailyInsightTarget(18, [
        { weightedScore: 86 },
        { weightedScore: 84 },
        { weightedScore: 83 },
        { weightedScore: 82 },
        { weightedScore: 81 },
        { weightedScore: 80 },
        { weightedScore: 79 },
        { weightedScore: 78 },
        { weightedScore: 77 },
        { weightedScore: 76 },
        { weightedScore: 75 },
        { weightedScore: 74 },
        { weightedScore: 73 },
        { weightedScore: 72 },
        { weightedScore: 72 },
        { weightedScore: 71 },
        { weightedScore: 70 },
        { weightedScore: 70 },
        { weightedScore: 69 },
        { weightedScore: 69 },
        { weightedScore: 68 },
        { weightedScore: 68 },
        { weightedScore: 68 },
        { weightedScore: 68 },
      ])
    ).toBe(24);
  });

  it("builds conservative fallback content for thin items", () => {
    const fallback = buildFallbackSections({
      title: "请问什么工具可以测数据库 C 接口的性能，以及稳定性？",
      content:
        "The user asks what tools can be used to test the performance and stability of an embedded database’s C API.",
      category: "software",
      source: "V2EX - 技术",
      scoreReasoning: "和工程实践相关，但原始内容较薄。",
      contentDepth: 104,
    });

    expect(fallback.event).toContain("V2EX");
    expect(fallback.interpretation).toBeUndefined();
  });
});
