import { describe, expect, it } from "vitest";
import {
  buildFallbackSections,
  buildInsightContent,
  getInvalidInsightFields,
  sanitizeInsightSections,
} from "./insight-format.js";

describe("insight-format", () => {
  it("builds compatibility content from four sections", () => {
    expect(
      buildInsightContent({
        fact: "事件已经发生。",
        impact: "对产品：入口被改写。",
        judgment: "变量转向入口分配。",
        action: "未来 1-2 周盯接口是否开放。",
      })
    ).toContain("动作：未来 1-2 周盯接口是否开放。");
  });

  it("flags generic sections as invalid", () => {
    expect(
      getInvalidInsightFields("苹果开放接口", {
        fact: "这条新闻讲的是苹果开放接口。",
        impact: "有重要影响，值得关注。",
        judgment: "值得关注。",
        action: "持续关注后续进展。",
      })
    ).toEqual(["fact", "impact", "judgment", "action"]);
  });

  it("falls back only for invalid fields", () => {
    const fallback = buildFallbackSections({
      title: "苹果开放 Siri 接口",
      content: "Apple is opening Siri interfaces for third-party assistants.",
      category: "software",
      source: "Bloomberg",
      scoreReasoning: "入口层变化开始影响产品与研发",
    });

    const sanitized = sanitizeInsightSections(
      "苹果开放 Siri 接口",
      {
        fact: "苹果准备开放系统级 Siri 接口给第三方助手。",
        impact: "有重要影响。",
        judgment: "变量从能力竞争转向入口竞争。",
        action: "未来 1-2 周盯是否披露接口范围和默认入口。",
      },
      fallback
    );

    expect(sanitized.fact).toContain("苹果准备开放系统级 Siri 接口");
    expect(sanitized.impact).toBe(fallback.impact);
    expect(sanitized.action).toContain("未来 1-2 周");
  });
});
