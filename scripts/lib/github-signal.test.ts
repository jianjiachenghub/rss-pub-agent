import { describe, expect, it } from "vitest";
import {
  extractGitHubTrendingStars,
  getGitHubTrendingSoftwareBonus,
  isGitHubTrendingRepoItem,
  rebalanceInsightsForGitHubTrending,
} from "./github-signal.js";

describe("github-signal", () => {
  it("detects GitHub trending repository entries", () => {
    expect(
      isGitHubTrendingRepoItem({
        source: "Trending repositories on GitHub today · GitHub - vercel",
        title: "vercel-labs/open-agents",
        url: "https://github.com/vercel-labs/open-agents",
      })
    ).toBe(true);

    expect(
      isGitHubTrendingRepoItem({
        source: "The GitHub Blog - Nick McKenna",
        title: "Copilot CLI adds a second opinion",
        url: "https://github.blog/ai-and-ml/github-copilot/example/",
      })
    ).toBe(false);
  });

  it("applies a software bonus to hot GitHub trending repos", () => {
    expect(extractGitHubTrendingStars("Language: TypeScript Stars: 12137 Forks: 822")).toBe(
      12137
    );

    expect(
      getGitHubTrendingSoftwareBonus({
        category: "software",
        source: "Trending repositories on GitHub today · GitHub - Lordog",
        title: "Lordog/dive-into-llms",
        url: "https://github.com/Lordog/dive-into-llms",
        content: "Language: Python Stars: 15000 Forks: 1200",
      })
    ).toBeGreaterThanOrEqual(15);

    expect(
      getGitHubTrendingSoftwareBonus({
        category: "ai",
        source: "Trending repositories on GitHub today · GitHub - Lordog",
        title: "Lordog/dive-into-llms",
        url: "https://github.com/Lordog/dive-into-llms",
        content: "Language: Python Stars: 15000 Forks: 1200",
      })
    ).toBe(0);
  });

  it("gives AI framework repositories a stronger GitHub trending bonus", () => {
    expect(
      getGitHubTrendingSoftwareBonus({
        category: "software",
        source: "Trending repositories on GitHub today · GitHub - Fission-AI",
        title: "Fission-AI/OpenSpec",
        url: "https://github.com/Fission-AI/OpenSpec",
        content:
          "Spec-driven development framework for AI coding assistants. Language: TypeScript Stars: 56000 Forks: 3900",
      })
    ).toBeGreaterThan(18);
  });

  it("promotes one GitHub trending repo into the deep-dive list when software lacks it", () => {
    const finalInsights = [
      {
        id: "ai-1",
        title: "OpenAI ships a new cyber program",
        url: "https://openai.com/example",
        source: "OpenAI News",
        category: "ai",
        weightedScore: 82,
      },
      {
        id: "software-1",
        title: "TinyVue 3.30 正式发布",
        url: "https://oschina.net/example",
        source: "开源中国-全部 - 白开水不加糖",
        category: "software",
        weightedScore: 57,
      },
      {
        id: "software-2",
        title: "Qbit 推出 AI 订阅 50% 返现计划",
        url: "https://oschina.net/example-2",
        source: "开源中国-全部 - 开源科技",
        category: "software",
        weightedScore: 69,
      },
    ];

    const candidateInsights = [
      ...finalInsights,
      {
        id: "software-gh-1",
        title: "vercel-labs/open-agents",
        url: "https://github.com/vercel-labs/open-agents",
        source: "Trending repositories on GitHub today · GitHub - vercel-labs",
        category: "software",
        weightedScore: 48,
      },
    ];

    const nextInsights = rebalanceInsightsForGitHubTrending(
      finalInsights,
      candidateInsights
    );

    expect(nextInsights).toHaveLength(finalInsights.length);
    expect(
      nextInsights.some((item) => item.id === "software-gh-1")
    ).toBe(true);
    expect(
      nextInsights.some((item) => item.id === "software-1")
    ).toBe(false);
  });

  it("promotes up to two GitHub trending repos when enough candidates exist", () => {
    const finalInsights = [
      {
        id: "ai-1",
        title: "OpenAI ships a new cyber program",
        url: "https://openai.com/example",
        source: "OpenAI News",
        category: "ai",
        weightedScore: 82,
      },
      {
        id: "software-1",
        title: "TinyVue 3.30 正式发布",
        url: "https://oschina.net/example",
        source: "开源中国-全部 - 白开水不加糖",
        category: "software",
        weightedScore: 57,
      },
      {
        id: "software-2",
        title: "普通开发工具动态",
        url: "https://example.com/devtool",
        source: "Example",
        category: "software",
        weightedScore: 56,
      },
    ];

    const candidateInsights = [
      ...finalInsights,
      {
        id: "software-gh-1",
        title: "Fission-AI/OpenSpec",
        url: "https://github.com/Fission-AI/OpenSpec",
        source: "Trending repositories on GitHub today · GitHub - Fission-AI",
        category: "software",
        weightedScore: 70,
      },
      {
        id: "software-gh-2",
        title: "hugohe3/ppt-master",
        url: "https://github.com/hugohe3/ppt-master",
        source: "Trending repositories on GitHub today · GitHub - hugohe3",
        category: "software",
        weightedScore: 61,
      },
    ];

    const nextInsights = rebalanceInsightsForGitHubTrending(
      finalInsights,
      candidateInsights
    );

    expect(nextInsights).toHaveLength(finalInsights.length);
    expect(nextInsights.filter((item) => item.url.startsWith("https://github.com/"))).toHaveLength(2);
  });
});
