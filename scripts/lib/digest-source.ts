import type { RawNewsItem } from "./types.js";

const DIGEST_SOURCE_PATTERNS = [
  /早报/u,
  /日报/u,
  /周报/u,
  /newsletter/i,
  /digest/i,
  /roundup/i,
  /brief/i,
];

const DIGEST_URL_PATTERNS = [
  /\/issue-\d+\/?$/i,
  /\/issues?\/\d+\/?$/i,
  /\/(daily|digest|roundup|newsletter|brief)\b/i,
];

const DIGEST_MARKER_PATTERNS = [
  /read the source issue/i,
  /视频版/u,
  /哔哩哔哩/u,
  /youtube/i,
  /概览/u,
  /要闻/u,
  /模型发布/u,
  /开发生态/u,
  /产品应用/u,
  /行业动态/u,
  /前瞻与传闻/u,
  /[‹<]\s*\d{4}-\d{2}-\d{2}\s+\d{4}-\d{2}-\d{2}\s*[›>]/u,
];

const DATE_ONLY_TITLE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{4}\/\d{2}\/\d{2}$/,
  /^\d{4}\s+\d{2}\s+\d{2}$/,
  /^\d{4}年\d{1,2}月\d{1,2}日$/u,
];

function normalizeText(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function isDateOnlyTitle(title: string): boolean {
  const normalized = normalizeText(title);
  return DATE_ONLY_TITLE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isDigestLikeItem(
  item: Pick<RawNewsItem, "title" | "source" | "url" | "content">
): boolean {
  const title = normalizeText(item.title);
  const source = normalizeText(item.source);
  const url = normalizeText(item.url).toLowerCase();
  const content = normalizeText(item.content);

  const dateOnlyTitle = isDateOnlyTitle(title);
  const sourceSignal = DIGEST_SOURCE_PATTERNS.some((pattern) => pattern.test(source));
  const urlSignal = DIGEST_URL_PATTERNS.some((pattern) => pattern.test(url));
  const markerHits = countMatches(content, DIGEST_MARKER_PATTERNS);
  const issueCount = content.match(/#\d{1,2}\b/g)?.length ?? 0;
  const repeatedDateCount =
    content.match(/\b20\d{2}-\d{2}-\d{2}\b/g)?.length ?? 0;

  return (
    (dateOnlyTitle && (sourceSignal || urlSignal) && (markerHits >= 2 || issueCount >= 3)) ||
    (sourceSignal && urlSignal && (markerHits >= 2 || issueCount >= 4)) ||
    (sourceSignal && markerHits >= 3 && issueCount >= 5) ||
    (dateOnlyTitle && repeatedDateCount >= 2 && issueCount >= 3)
  );
}
