import { describe, expect, it } from "vitest";
import { inferCategory } from "./pre-filter.js";
import type { RawNewsItem } from "./types.js";

function item(overrides: Partial<RawNewsItem>): RawNewsItem {
  return {
    id: "item-1",
    title: "Example",
    url: "https://example.com",
    content: "Example content with enough detail.",
    source: "Example",
    sourceId: "example",
    category: "tech",
    publishedAt: "2026-06-27T00:00:00.000Z",
    fetchedAt: "2026-06-27T00:01:00.000Z",
    ...overrides,
  };
}

describe("inferCategory", () => {
  it("does not classify geopolitical framework agreements as software", () => {
    expect(
      inferCategory(
        item({
          title: "以色列和黎巴嫩达成旨在结束冲突的框架协议",
          url: "https://www.bloomberg.com/news/articles/example",
          content:
            "以色列、黎巴嫩和美国达成初步三方框架协议，目标是为结束两国冲突并最终达成和平安排铺路。",
          source: "彭博社最新报道",
          category: "politics",
        })
      )
    ).toBe("politics");
  });

  it("keeps AI development frameworks in software", () => {
    expect(
      inferCategory(
        item({
          title: "Fission-AI/OpenSpec",
          url: "https://github.com/Fission-AI/OpenSpec",
          content:
            "Spec-driven development framework for AI coding assistants with SDK examples and MCP integrations.",
          source: "Trending repositories on GitHub today · GitHub - Fission-AI",
          category: "software",
        })
      )
    ).toBe("software");
  });
});
