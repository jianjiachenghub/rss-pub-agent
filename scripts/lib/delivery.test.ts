import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDailyUrl,
  buildFeishuDigest,
  buildWeChatDigest,
  selectHighlights,
  sendWeChatOfficialAccountTextMessage,
} from "./delivery.js";
import type { NewsInsight } from "./types.js";

function createInsight(overrides: Partial<NewsInsight> = {}): NewsInsight {
  return {
    id: overrides.id ?? "id",
    title: overrides.title ?? "Title",
    url: overrides.url ?? "https://example.com",
    source: overrides.source ?? "Example",
    category: overrides.category ?? "ai",
    publishedAt: overrides.publishedAt ?? "2026-03-27T00:00:00.000Z",
    oneLiner: overrides.oneLiner ?? "一句话亮点",
    event: overrides.event ?? "事件",
    interpretation: overrides.interpretation ?? "解读",
    content: overrides.content ?? "事件：事件\n\n解读：解读",
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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
          oneLiner: "资本市场异动",
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
        createInsight({
          id: "1",
          oneLiner: "模型侧变化开始传导到应用层",
        }),
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

  it("renders a WeChat digest with a bounded text payload", () => {
    const digest = buildWeChatDigest({
      reportName: "Daily",
      date: "2026-03-27",
      dailySummary: "x".repeat(3000),
      insights: [createInsight({ oneLiner: "Key item" })],
      dailyUrl: "https://example.com/2026-03-27",
    });

    expect(digest.length).toBeLessThanOrEqual(1800);
    expect(digest.endsWith("...")).toBe(true);
  });

  it("fetches an access token before sending a WeChat custom text message", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        const value = String(url);
        if (value.startsWith("https://api.weixin.qq.com/cgi-bin/token?")) {
          return Response.json({ access_token: "token", expires_in: 7200 });
        }

        if (
          value ===
          "https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=token"
        ) {
          expect(init?.method).toBe("POST");
          expect(JSON.parse(String(init?.body))).toEqual({
            touser: "openid",
            msgtype: "text",
            text: { content: "hello" },
          });
          return Response.json({ errcode: 0, errmsg: "ok" });
        }

        throw new Error(`Unexpected URL: ${value}`);
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendWeChatOfficialAccountTextMessage({
        appId: "app",
        appSecret: "secret",
        openId: "openid",
        text: "hello",
      })
    ).resolves.toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
