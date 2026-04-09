import { describe, expect, it } from "vitest";
import {
  classifyEditorialCategory,
  getCommunityScorePenalty,
  hasConcreteCommunitySignal,
  isCommunitySource,
  isLowSignalCommunityItem,
} from "./community-source.js";

describe("community-source", () => {
  it("classifies community URLs as social regardless of topic keywords", () => {
    expect(
      classifyEditorialCategory("ai", {
        source: "V2EX - 技术",
        url: "https://www.v2ex.com/t/1204135#reply0",
      })
    ).toBe("social");

    expect(
      classifyEditorialCategory("software", {
        source: "Hacker News - dang",
        url: "https://news.ycombinator.com/item?id=123",
      })
    ).toBe("social");
  });

  it("treats generic forum questions as low-signal community items", () => {
    const item = {
      source: "V2EX - 技术",
      url: "https://www.v2ex.com/t/1204060#reply13",
      title: "How do I keep Claude Code stable while traveling?",
      content: "I am looking for setup advice and personal experience.",
    };

    expect(isCommunitySource(item)).toBe(true);
    expect(isLowSignalCommunityItem(item)).toBe(true);
    expect(getCommunityScorePenalty(item)).toBe(28);
  });

  it("keeps concrete release-style community posts out of the harshest bucket", () => {
    const item = {
      source: "V2EX - 技术",
      url: "https://www.v2ex.com/t/1203743#reply1",
      title: "XXL-JOB v3.4.0 release with OpenClaw integration",
      content:
        "Release notes include OpenClaw integration, batch scheduling updates, and a changelog for the new version.",
    };

    expect(hasConcreteCommunitySignal(item)).toBe(true);
    expect(isLowSignalCommunityItem(item)).toBe(false);
    expect(getCommunityScorePenalty(item)).toBe(12);
  });

  it("flags promotional community posts as low-signal", () => {
    const item = {
      source: "V2EX - 技术",
      url: "https://www.v2ex.com/t/1204085#reply7",
      title: "[Giveaway] Mirrorstages supports CC Max now",
      content: "Register to get credits, referral discounts, and coupon pricing.",
    };

    expect(isLowSignalCommunityItem(item)).toBe(true);
  });
});
