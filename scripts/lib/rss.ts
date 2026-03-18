import Parser from "rss-parser";
import type { RawNewsItem } from "./types.js";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "Mozilla/5.0 LLM-News-Flow/1.0",
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
  },
});

export async function fetchRSS(
  url: string,
  sourceId: string,
  sourceName: string,
  category: string
): Promise<RawNewsItem[]> {
  const feed = await parser.parseURL(url);
  const now = new Date().toISOString();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  const items = (feed.items ?? [])
    .filter((item) => {
      const pubDate = item.isoDate ?? item.pubDate;
      if (!pubDate) return true;
      return new Date(pubDate).getTime() > oneDayAgo;
    });

  return items.map((item, i) => ({
    id: `${sourceId}-${i}-${Date.now()}`,
    title: item.title ?? "Untitled",
    url: item.link ?? "",
    content: item.contentSnippet ?? item.content ?? "",
    source: sourceName,
    sourceId,
    category,
    publishedAt: item.isoDate ?? item.pubDate ?? now,
    fetchedAt: now,
  }));
}
