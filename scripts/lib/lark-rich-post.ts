import { CATEGORY_LABELS } from "./prompts.js";

type LarkPostElement =
  | {
      tag: "text";
      text: string;
    }
  | {
      tag: "a";
      text: string;
      href: string;
    };

export interface LarkPostPayload {
  zh_cn: {
    title: string;
    content: LarkPostElement[][];
  };
}

interface DailyNewsItem {
  title: string;
  href?: string;
  event?: string;
  interpretation?: string;
  scoreSource?: string;
  sourceName?: string;
  sourceHref?: string;
}

interface DailyCategorySection {
  label: string;
  items: DailyNewsItem[];
}

export interface LarkDailyCategoryTextMessage {
  category: string;
  itemCount: number;
  title: string;
  text: string;
}

export interface LarkDailyCategoryMarkdownMessage {
  category: string;
  itemCount: number;
  title: string;
  markdown: string;
}

const CATEGORY_LABEL_SET = new Set(Object.values(CATEGORY_LABELS));
const STOP_SECTION_TITLES = new Set(["接下来要盯的变量", "更多 24h 资讯"]);
const DEFAULT_CATEGORY_TEXT_MAX_CHARS = 900;
const DEFAULT_CATEGORY_MARKDOWN_MAX_CHARS = 7000;

function cleanMarkdownText(value: string): string {
  return value
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFrontMatterValue(markdown: string, key: string): string | undefined {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return undefined;

  const lineMatch = match[1].match(new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, "m"));
  return lineMatch?.[1]?.trim();
}

function extractReportName(markdown: string): string {
  const frontMatterTitle = extractFrontMatterValue(markdown, "title");
  const h1Title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = frontMatterTitle || h1Title || "个人日报";
  return title.split("|")[0]?.trim() || "个人日报";
}

function extractDate(markdown: string, fallbackDate?: string): string {
  return (
    extractFrontMatterValue(markdown, "date")?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ??
    fallbackDate ??
    "unknown-date"
  );
}

function parseMarkdownLink(value: string): Pick<DailyNewsItem, "title" | "href"> {
  const linkMatch = value.match(/^\[([^\]]+)]\(([^)]+)\)$/);
  if (!linkMatch) {
    return { title: cleanMarkdownText(value) };
  }

  return {
    title: cleanMarkdownText(linkMatch[1]),
    href: linkMatch[2].trim(),
  };
}

function parseSourceLine(value: string): {
  scoreSource: string;
  sourceName?: string;
  sourceHref?: string;
} {
  const cleaned = cleanMarkdownText(value);
  const sourceMatch = value.match(/来源\s+\[([^\]]+)]\(([^)]+)\)/);
  const scoreMatch = cleaned.match(/评分\s+\d+/);
  const sourceName = sourceMatch?.[1]?.trim();
  const sourceHref = sourceMatch?.[2]?.trim();

  return {
    scoreSource: [
      scoreMatch?.[0],
      sourceName ? `来源：${sourceName}` : undefined,
    ]
      .filter(Boolean)
      .join(" · "),
    sourceName,
    sourceHref,
  };
}

function parseDailyNewsSections(markdown: string): DailyCategorySection[] {
  const sections: DailyCategorySection[] = [];
  let currentSection: DailyCategorySection | null = null;
  let currentItem: DailyNewsItem | null = null;

  const flushItem = () => {
    if (currentSection && currentItem) {
      currentSection.items.push(currentItem);
    }
    currentItem = null;
  };

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();

    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      flushItem();
      const sectionTitle = cleanMarkdownText(sectionMatch[1]);
      if (STOP_SECTION_TITLES.has(sectionTitle)) {
        currentSection = null;
        break;
      }

      if (CATEGORY_LABEL_SET.has(sectionTitle)) {
        currentSection = { label: sectionTitle, items: [] };
        sections.push(currentSection);
      } else {
        currentSection = null;
      }
      continue;
    }

    if (!currentSection) continue;

    const itemMatch = line.match(/^###\s+(.+)$/);
    if (itemMatch) {
      flushItem();
      currentItem = parseMarkdownLink(itemMatch[1]);
      continue;
    }

    if (!currentItem || !line || line === "---" || line.startsWith("![")) {
      continue;
    }

    if (line.startsWith("**事件：**")) {
      currentItem.event = cleanMarkdownText(line.replace("**事件：**", ""));
      continue;
    }

    if (line.startsWith("**解读：**")) {
      currentItem.interpretation = cleanMarkdownText(line.replace("**解读：**", ""));
      continue;
    }

    if (line.startsWith("评分 ")) {
      const parsed = parseSourceLine(line);
      currentItem.scoreSource = parsed.scoreSource;
      currentItem.sourceName = parsed.sourceName;
      currentItem.sourceHref = parsed.sourceHref;
      currentItem.href = currentItem.href ?? parsed.sourceHref;
    }
  }

  flushItem();
  return sections.filter((section) => section.items.length > 0);
}

function pushText(content: LarkPostElement[][], text: string): void {
  if (text.trim()) {
    content.push([{ tag: "text", text }]);
  }
}

function buildItemTitleParagraph(index: number, item: DailyNewsItem): LarkPostElement[] {
  const prefix: LarkPostElement = { tag: "text", text: `${index}. ` };
  if (item.href) {
    return [prefix, { tag: "a", text: item.title, href: item.href }];
  }
  return [prefix, { tag: "text", text: item.title }];
}

function truncateChatText(value: string, maxChars: number): string {
  const normalized = cleanMarkdownText(value);
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(1, maxChars - 1))}…`;
}

function escapeMarkdownText(value: string): string {
  return cleanMarkdownText(value).replace(/([\\[\]])/g, "\\$1");
}

function sanitizeMarkdownUrl(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized || /[\s<>]/.test(normalized)) return undefined;
  return normalized;
}

function markdownLink(label: string, href: string | undefined): string {
  const safeHref = sanitizeMarkdownUrl(href);
  const safeLabel = escapeMarkdownText(label);
  return safeHref ? `[${safeLabel}](${safeHref})` : safeLabel;
}

function formatCategoryTextItem(index: number, item: DailyNewsItem): string {
  const lines = [`${index}. ${truncateChatText(item.title, 72)}`];

  if (item.scoreSource) {
    lines.push(truncateChatText(item.scoreSource, 56));
  }

  if (item.event) {
    lines.push(`事件：${truncateChatText(item.event, 96)}`);
  }

  return lines.join("\n");
}

function buildCategoryText(title: string, itemBlocks: string[], totalItems: number): string {
  return [title, `本分类共 ${totalItems} 条`, "", ...itemBlocks].join("\n").trim();
}

function isGitHubHref(href: string | undefined): boolean {
  return /^https?:\/\/github\.com\//i.test(href ?? "");
}

function formatCategoryMarkdownItem(index: number, item: DailyNewsItem): string {
  const lines = [`**${index}. ${markdownLink(item.title, item.href)}**`];

  if (item.event) {
    lines.push(`**事件：** ${escapeMarkdownText(truncateChatText(item.event, 140))}`);
  }

  if (item.interpretation) {
    lines.push(
      `**解读：** ${escapeMarkdownText(truncateChatText(item.interpretation, 160))}`
    );
  }

  if (item.sourceName && item.sourceHref) {
    const label = isGitHubHref(item.sourceHref) || isGitHubHref(item.href)
      ? "仓库"
      : "来源";
    lines.push(`**${label}：** ${markdownLink(item.sourceName, item.sourceHref)}`);
  } else if (item.scoreSource) {
    lines.push(escapeMarkdownText(truncateChatText(item.scoreSource, 72)));
  }

  return lines.join("\n");
}

function buildCategoryMarkdown(
  title: string,
  _category: string,
  itemBlocks: string[],
  totalItems: number
): string {
  return [
    `**${escapeMarkdownText(title)}**`,
    `本分类共 **${totalItems}** 条`,
    ...itemBlocks,
  ].join("\n\n").trim();
}

export function buildLarkDailyCategoryTextMessagesFromMarkdown(
  markdown: string,
  options: { fallbackDate?: string; maxChars?: number } = {}
): LarkDailyCategoryTextMessage[] {
  const reportName = extractReportName(markdown);
  const date = extractDate(markdown, options.fallbackDate);
  const sections = parseDailyNewsSections(markdown);
  const maxChars =
    typeof options.maxChars === "number" && options.maxChars > 0
      ? Math.floor(options.maxChars)
      : DEFAULT_CATEGORY_TEXT_MAX_CHARS;

  if (sections.length === 0) {
    throw new Error("No categorized daily news sections found in daily.md");
  }

  const messages: LarkDailyCategoryTextMessage[] = [];

  for (const section of sections) {
    const chunks: string[][] = [];
    let currentChunk: string[] = [];

    const flushChunk = () => {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
    };

    for (const [index, item] of section.items.entries()) {
      const itemBlock = formatCategoryTextItem(index + 1, item);
      const draftTitle = `${reportName} | ${date} | ${section.label}`;
      const draftText = buildCategoryText(
        draftTitle,
        [...currentChunk, itemBlock],
        section.items.length
      );

      if (currentChunk.length > 0 && draftText.length > maxChars) {
        flushChunk();
      }

      currentChunk.push(itemBlock);
    }

    flushChunk();

    for (const [chunkIndex, itemBlocks] of chunks.entries()) {
      const title =
        chunks.length > 1
          ? `${reportName} | ${date} | ${section.label}（${chunkIndex + 1}/${chunks.length}）`
          : `${reportName} | ${date} | ${section.label}`;

      messages.push({
        category: section.label,
        itemCount: itemBlocks.length,
        title,
        text: buildCategoryText(title, itemBlocks, section.items.length),
      });
    }
  }

  return messages;
}

export function buildLarkDailyCategoryMarkdownMessagesFromMarkdown(
  markdown: string,
  options: { fallbackDate?: string; maxChars?: number } = {}
): LarkDailyCategoryMarkdownMessage[] {
  const reportName = extractReportName(markdown);
  const date = extractDate(markdown, options.fallbackDate);
  const sections = parseDailyNewsSections(markdown);
  const maxChars =
    typeof options.maxChars === "number" && options.maxChars > 0
      ? Math.floor(options.maxChars)
      : DEFAULT_CATEGORY_MARKDOWN_MAX_CHARS;

  if (sections.length === 0) {
    throw new Error("No categorized daily news sections found in daily.md");
  }

  const messages: LarkDailyCategoryMarkdownMessage[] = [];

  for (const section of sections) {
    const chunks: string[][] = [];
    let currentChunk: string[] = [];

    const flushChunk = () => {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
    };

    for (const [index, item] of section.items.entries()) {
      const itemBlock = formatCategoryMarkdownItem(index + 1, item);
      const draftTitle = `${reportName} | ${date} | ${section.label}`;
      const draftMarkdown = buildCategoryMarkdown(
        draftTitle,
        section.label,
        [...currentChunk, itemBlock],
        section.items.length
      );

      if (currentChunk.length > 0 && draftMarkdown.length > maxChars) {
        flushChunk();
      }

      currentChunk.push(itemBlock);
    }

    flushChunk();

    for (const [chunkIndex, itemBlocks] of chunks.entries()) {
      const title =
        chunks.length > 1
          ? `${reportName} | ${date} | ${section.label}（${chunkIndex + 1}/${chunks.length}）`
          : `${reportName} | ${date} | ${section.label}`;

      messages.push({
        category: section.label,
        itemCount: itemBlocks.length,
        title,
        markdown: buildCategoryMarkdown(
          title,
          section.label,
          itemBlocks,
          section.items.length
        ),
      });
    }
  }

  return messages;
}

export function buildLarkDailyNewsPostFromMarkdown(
  markdown: string,
  options: { fallbackDate?: string; maxItems?: number } = {}
): LarkPostPayload {
  const reportName = extractReportName(markdown);
  const date = extractDate(markdown, options.fallbackDate);
  const sections = parseDailyNewsSections(markdown);

  if (sections.length === 0) {
    throw new Error("No categorized daily news sections found in daily.md");
  }

  const content: LarkPostElement[][] = [];
  const maxItems =
    typeof options.maxItems === "number" && options.maxItems > 0
      ? Math.floor(options.maxItems)
      : Number.POSITIVE_INFINITY;
  let renderedItems = 0;
  let truncated = false;

  for (const section of sections) {
    if (renderedItems >= maxItems) {
      truncated = true;
      break;
    }

    pushText(content, section.label);

    for (const [index, item] of section.items.entries()) {
      if (renderedItems >= maxItems) {
        truncated = true;
        break;
      }

      content.push(buildItemTitleParagraph(index + 1, item));
      pushText(content, item.event ? `事件：${item.event}` : "");
      pushText(content, item.interpretation ? `解读：${item.interpretation}` : "");

      if (item.scoreSource) {
        pushText(content, item.scoreSource);
      }
      renderedItems++;
    }
  }

  if (truncated) {
    pushText(content, `已截取前 ${renderedItems} 条，完整日报见站点或仓库 content 目录。`);
  }

  return {
    zh_cn: {
      title: `${reportName} | ${date}`,
      content,
    },
  };
}
