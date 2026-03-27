import { describe, expect, it } from "vitest";
import {
  buildDailyUrl,
  buildFeishuDigest,
  selectHighlights,
} from "./delivery.js";
import type { NewsInsight } from "./types.js";

function createInsight(overrides: Partial<NewsInsight>): NewsInsight {
  return {
    id: overrides.id ?? "id",
    title: overrides.title ?? "Title",
    url: overrides.url ?? "https://example.com",
    source: overrides.source ?? "Example",
    category: overrides.category ?? "ai",
    publishedAt: overrides.publishedAt ?? "2026-03-27T00:00:00.000Z",
    oneLiner: overrides.oneLiner ?? "一句话亮点",
    fact: overrides.fact ?? "事实",
    impact: overrides.impact ?? "影响",
    judgment: overrides.judgment ?? "判断",
    action: overrides.action ?? "行动",
    content: overrides.content ?? "内容",
    imageUrl: overrides.imageUrl,
    codeSnippet: overrides.codeSnippet,
    comparisonTable: overrides.comparisonTable,
    scores:
      overrides.scores ?? {
        signalStrength: 8,
        futureImpact: 8,
        personalRelevance: 8,
        decisionUsefulness: 8,
        credibility: 8,
        timeliness: 8,
      },
    weightedScore: overrides.weightedScore ?? 80,
  };
}

describe("delivery helpers", () => {
  it("builds a stable daily report URL", () => {
    expect(buildDailyUrl("https://example.com/", "2026-03-27")).toBe(
      "https://example.com/2026-03-27"
    );
  });

  it("prefers category diversity before backfilling highlights", () => {
    const highlights = selectHighlights(
      [
        createInsight({
          id: "1",
          category: "ai",
          oneLiner: "AI 主线判断",
          weightedScore: 95,
        }),
        createInsight({
          id: "2",
          category: "ai",
          oneLiner: "AI 第二条",
          weightedScore: 90,
        }),
        createInsight({
          id: "3",
          category: "investment",
          oneLiner: "投资异动",
          weightedScore: 89,
        }),
        createInsight({
          id: "4",
          category: "business",
          oneLiner: "商业化进展",
          weightedScore: 88,
        }),
      ],
      3
    );

    expect(highlights.map((item) => item.id)).toEqual(["1", "3", "4"]);
  });

  it("renders a digest with summary, highlights, and link", () => {
    const digest = buildFeishuDigest({
      reportName: "个人日报",
      date: "2026-03-27",
      dailySummary: "今天最重要的判断是 Agent 工程化继续提速。",
      insights: [
        createInsight({ id: "1", oneLiner: "模型侧变化开始传导到应用层" }),
        createInsight({
          id: "2",
          category: "investment",
          oneLiner: "资本市场对 AI 基础设施重新定价",
        }),
      ],
      dailyUrl: "https://example.com/2026-03-27",
      maxHighlights: 3,
    });

    expect(digest).toContain("今日摘要：");
    expect(digest).toContain("今日 Highlights：");
    expect(digest).toContain("阅读全文：");
    expect(digest).toContain("https://example.com/2026-03-27");
  });
});
