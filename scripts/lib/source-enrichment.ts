import type { RawNewsItem } from "./types.js";
import { isInformativeImage } from "./insight-format.js";

const REQUEST_TIMEOUT_MS = 20000;
const MAX_PARAGRAPHS = 6;
const MAX_CONTENT_LENGTH = 1600;

function normalizeText(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&hellip;/gi, "…")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/");
}

function stripTags(html: string): string {
  // First decode entities so encoded tags like &lt;img&gt; become real tags
  const decoded = decodeHtmlEntities(html);
  return decoded
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/?[a-z][^>]*>/gi, " ")    // complete tags
    .replace(/<\/?[a-z][^>]{0,300}$/gi, " "); // truncated tag at end of string
}

function extractMetaContent(
  html: string,
  selectors: Array<{ attr: string; value: string }>
): string {
  for (const selector of selectors) {
    const pattern = new RegExp(
      `<meta[^>]+${selector.attr}=["']${selector.value}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    );
    const reversed = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+${selector.attr}=["']${selector.value}["'][^>]*>`,
      "i"
    );
    const match = html.match(pattern) ?? html.match(reversed);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }
  return "";
}

function toAbsoluteUrl(baseUrl: string, maybeUrl: string): string {
  try {
    return new URL(maybeUrl, baseUrl).toString();
  } catch {
    return "";
  }
}

function extractParagraphs(html: string): string[] {
  const matches = [...html.matchAll(/<(p|article|main|div)[^>]*>([\s\S]*?)<\/\1>/gi)];
  const paragraphs: string[] = [];

  for (const match of matches) {
    const text = normalizeText(stripTags(match[2]));
    if (text.length < 40) continue;
    if (/cookie|subscribe|sign up|newsletter|copyright|all rights reserved/i.test(text)) {
      continue;
    }
    paragraphs.push(text);
    if (paragraphs.length >= MAX_PARAGRAPHS) break;
  }

  return paragraphs;
}

function buildBestContent(
  item: RawNewsItem,
  description: string,
  paragraphs: string[]
): { content: string; contentSource: "summary" | "page"; contentDepth: number } {
  const current = normalizeText(item.content);
  const summary = normalizeText(item.summary ?? item.content);

  const pageText = normalizeText(
    [description, ...paragraphs]
      .filter(Boolean)
      .join("\n")
      .slice(0, MAX_CONTENT_LENGTH)
  );

  if (pageText.length >= Math.max(current.length + 60, 220)) {
    return {
      content: pageText,
      contentSource: "page",
      contentDepth: pageText.length,
    };
  }

  const fallback = current || summary;
  return {
    content: fallback,
    contentSource: "summary",
    contentDepth: fallback.length,
  };
}

function pickInformativeImage(
  item: RawNewsItem,
  html: string,
  description: string,
  baseUrl: string
): string | undefined {
  const metaImage = extractMetaContent(html, [
    { attr: "property", value: "og:image" },
    { attr: "name", value: "twitter:image" },
  ]);

  const context = `${item.title} ${description} ${item.content}`;
  const candidates = [
    metaImage,
    ...[...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map(
      (match) => match[1]
    ),
  ]
    .map((candidate) => toAbsoluteUrl(baseUrl, candidate))
    .filter(Boolean);

  for (const candidate of candidates) {
    if (isInformativeImage(candidate, context)) {
      return candidate;
    }
  }

  return undefined;
}

export async function enrichNewsItem<T extends RawNewsItem>(item: T): Promise<T> {
  const baseItem = {
    ...item,
    summary: item.summary ?? item.content,
    contentDepth: item.contentDepth ?? normalizeText(item.content).length,
    contentSource: item.contentSource ?? "summary",
  };

  if (!item.url) {
    return baseItem;
  }

  try {
    const response = await fetch(item.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 LLM-News-Flow/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return baseItem;
    }

    const html = await response.text();
    if (!/html/i.test(response.headers.get("content-type") ?? "") && !/<html/i.test(html)) {
      return baseItem;
    }

    const description = normalizeText(
      stripTags(
        extractMetaContent(html, [
          { attr: "property", value: "og:description" },
          { attr: "name", value: "description" },
          { attr: "name", value: "twitter:description" },
        ])
      )
    );

    const paragraphs = extractParagraphs(html);
    let content = buildBestContent(baseItem, description, paragraphs);

    // Final safety: strip any residual HTML tags that slipped through
    if (/<[a-z]/i.test(content.content)) {
      const cleaned = normalizeText(stripTags(content.content));
      content = { ...content, content: cleaned, contentDepth: cleaned.length };
    }
    const imageUrl =
      pickInformativeImage(baseItem, html, description, item.url) ?? baseItem.imageUrl;

    return {
      ...baseItem,
      content: content.content,
      contentSource: content.contentSource,
      contentDepth: content.contentDepth,
      imageUrl,
    };
  } catch {
    return baseItem;
  }
}
