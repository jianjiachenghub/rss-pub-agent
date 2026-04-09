import { describe, expect, it } from "vitest";
import { isDigestLikeItem } from "./digest-source.js";

describe("digest-source", () => {
  it("flags date-titled roundup issues with navigation and numbered summaries", () => {
    expect(
      isDigestLikeItem({
        title: "2026-04-07",
        source: "橘鸦AI早报",
        url: "https://imjuya.github.io/juya-ai-daily/issue-52/",
        content:
          "Contents AI 早报 2026-04-07 概览 Anthropic 年化收入已超三百亿美元 #1 OpenAI 发布政策蓝图 #2 OpenBMB 发布 VoxCPM2 #3 Claude Code 被发现禁止分析自身源代码 2026-04-07 2026-04-07 read the source issue AI 早报 2026-04-07 视频版 ： 哔哩哔哩 ｜ YouTube 概览 要闻 #4 OpenClaw 发布 v2026.4.5 引入梦境记忆功能",
      })
    ).toBe(true);
  });

  it("does not flag normal topic pages that happen to come from a daily brief source", () => {
    expect(
      isDigestLikeItem({
        title: "苹果 App Store 今年 Q1 应用提交量同比激增 84%",
        source: "Readhub - 每日早报",
        url: "https://readhub.cn/topic/8s6JX9GEyNQ",
        content:
          "苹果 App Store 在 2026 年第一季度的应用提交量同比增长 84%，审核周期与开发者提交结构也同步出现变化。",
      })
    ).toBe(false);
  });

  it("flags English newsletter digest issues with issue URLs and numbered blurbs", () => {
    expect(
      isDigestLikeItem({
        title: "2026-04-07",
        source: "AI Digest",
        url: "https://example.com/newsletter/issue-17",
        content:
          "AI Digest overview #1 Model release #2 Funding round #3 Safety update read the source issue YouTube",
      })
    ).toBe(true);
  });
});
