import { isCategoryDisplayLabel, stripGenericIssueHeading } from "@/lib/display-text";

const FRONTMATTER_PATTERN = /^---[\s\S]*?---\n?/;

export interface DailyReportItemMeta {
  score?: number;
  sourceName?: string;
  sourceUrl?: string;
}

export interface DailyReportItem {
  id: string;
  title: string;
  meta: DailyReportItemMeta;
  summary: string;
  bodyMarkdown: string;
}

export interface DailyReportMarkdownSection {
  type: "markdown";
  id: string;
  title: string;
  bodyMarkdown: string;
}

export interface DailyReportCategorySection {
  type: "category";
  id: string;
  title: string;
  items: DailyReportItem[];
}

export type DailyReportSection =
  | DailyReportMarkdownSection
  | DailyReportCategorySection;

export interface DailyReportOutlineSection {
  id: string;
  title: string;
  items: Array<{ id: string; title: string }>;
}

export interface ParsedDailyReport {
  body: string;
  sections: DailyReportSection[];
  outline: DailyReportOutlineSection[];
}

interface HeadingBlock {
  title: string;
  body: string;
}

function stripFrontmatter(content: string): string {
  return content.replace(FRONTMATTER_PATTERN, "").trim();
}

function normalizeInlineMarkdownText(value: string): string {
  return value
    .replace(/^>\s?/gm, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitHeadingBlocks(markdown: string, marker: "##" | "###"): HeadingBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: HeadingBlock[] = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];
  let inCodeFence = false;

  const pushCurrent = () => {
    if (!currentTitle) return;
    blocks.push({
      title: currentTitle,
      body: currentLines.join("\n").trim(),
    });
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeFence = !inCodeFence;
    }

    const isHeading =
      !inCodeFence &&
      line.startsWith(`${marker} `) &&
      (marker === "##" ? !line.startsWith("### ") : true);

    if (isHeading) {
      pushCurrent();
      currentTitle = line.slice(marker.length + 1).trim();
      currentLines = [];
      continue;
    }

    if (currentTitle) {
      currentLines.push(line);
    }
  }

  pushCurrent();
  return blocks;
}

function splitMarkdownBlocks(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: string[] = [];
  let currentLines: string[] = [];
  let inCodeFence = false;

  const pushCurrent = () => {
    const value = currentLines.join("\n").trim();
    if (value) {
      blocks.push(value);
    }
    currentLines = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeFence = !inCodeFence;
      currentLines.push(line);
      continue;
    }

    if (!inCodeFence && !line.trim()) {
      pushCurrent();
      continue;
    }

    currentLines.push(line);
  }

  pushCurrent();
  return blocks;
}

function trimTrailingItemSeparator(markdown: string): string {
  return markdown.replace(/\n*---\s*$/u, "").trim();
}

function parseMetaBlock(
  block: string
): { meta: DailyReportItemMeta; summary: string; consumed: true } | null {
  const normalized = block.trim();
  const newFormatMatch = normalized.match(
    /^评分\s+(\d+)\s*[·•|｜]\s*来源\s*\[([^\]]+)\]\(([^)]+)\)\s*$/u
  );
  const newFormatMatchEn = normalized.match(
    /^Score\s+(\d+)\s*[·•|｜]\s*Source\s*\[([^\]]+)\]\(([^)]+)\)\s*$/iu
  );

  if (newFormatMatch) {
    return {
      meta: {
        score: Number(newFormatMatch[1]),
        sourceName: newFormatMatch[2].trim(),
        sourceUrl: newFormatMatch[3].trim(),
      },
      summary: "",
      consumed: true,
    };
  }

  if (newFormatMatchEn) {
    return {
      meta: {
        score: Number(newFormatMatchEn[1]),
        sourceName: newFormatMatchEn[2].trim(),
        sourceUrl: newFormatMatchEn[3].trim(),
      },
      summary: "",
      consumed: true,
    };
  }

  const legacyLines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const legacyMatch = legacyLines[0]?.match(
    /^>\s*\*\*(\d+)\s*分\*\*\s*[|｜]\s*来源[:：]?\s*\[([^\]]+)\]\(([^)]+)\)\s*$/u
  );

  if (!legacyMatch) {
    return null;
  }

  return {
    meta: {
      score: Number(legacyMatch[1]),
      sourceName: legacyMatch[2].trim(),
      sourceUrl: legacyMatch[3].trim(),
    },
    summary: normalizeInlineMarkdownText(legacyLines.slice(1).join(" ")),
    consumed: true,
  };
}

function isLikelySummaryBlock(block: string): boolean {
  const value = block.trim();
  if (!value) return false;

  return !(
    value.startsWith("![") ||
    value.startsWith(">") ||
    value.startsWith("**事件") ||
    value.startsWith("**解读") ||
    value.startsWith("**Event") ||
    value.startsWith("**Why it matters") ||
    value.startsWith("#### ") ||
    value.startsWith("|") ||
    value.startsWith("```") ||
    value.startsWith("- ") ||
    value.startsWith("1. ")
  );
}

function parseItemContent(markdown: string): {
  meta: DailyReportItemMeta;
  summary: string;
  bodyMarkdown: string;
} {
  const blocks = splitMarkdownBlocks(trimTrailingItemSeparator(markdown));
  const meta: DailyReportItemMeta = {};
  let summary = "";

  // Try parsing meta from the first block (legacy format)
  if (blocks.length > 0) {
    const parsedMeta = parseMetaBlock(blocks[0]);
    if (parsedMeta) {
      Object.assign(meta, parsedMeta.meta);
      summary = parsedMeta.summary;
      blocks.shift();
    }
  }

  // Try parsing meta from the last block (new format: score/source after content)
  if (!meta.score && blocks.length > 0) {
    const parsedMeta = parseMetaBlock(blocks[blocks.length - 1]);
    if (parsedMeta) {
      Object.assign(meta, parsedMeta.meta);
      if (!summary && parsedMeta.summary) {
        summary = parsedMeta.summary;
      }
      blocks.pop();
    }
  }

  if (!summary && blocks.length > 0 && isLikelySummaryBlock(blocks[0])) {
    summary = normalizeInlineMarkdownText(blocks.shift() ?? "");
  }

  return {
    meta,
    summary,
    bodyMarkdown: blocks.join("\n\n").trim(),
  };
}

function parseCategorySection(
  section: HeadingBlock,
  sectionIndex: number
): DailyReportCategorySection {
  const itemBlocks = splitHeadingBlocks(section.body, "###");

  return {
    type: "category",
    id: `daily-section-${sectionIndex + 1}`,
    title: section.title,
    items: itemBlocks.map((itemBlock, itemIndex) => {
      const parsed = parseItemContent(itemBlock.body);
      return {
        id: `daily-item-${sectionIndex + 1}-${itemIndex + 1}`,
        title: itemBlock.title,
        meta: parsed.meta,
        summary: parsed.summary,
        bodyMarkdown: parsed.bodyMarkdown,
      };
    }),
  };
}

export function parseDailyReport(content: string): ParsedDailyReport {
  const body = stripGenericIssueHeading(stripFrontmatter(content));
  const headingBlocks = splitHeadingBlocks(body, "##");

  const sections: DailyReportSection[] = headingBlocks.map((section, index) => {
    if (isCategoryDisplayLabel(section.title)) {
      return parseCategorySection(section, index);
    }

    return {
      type: "markdown",
      id: `daily-section-${index + 1}`,
      title: section.title,
      bodyMarkdown: section.body.trim(),
    };
  });

  const outline = sections.map((section) => ({
    id: section.id,
    title: section.title,
    items:
      section.type === "category"
        ? section.items.map((item) => ({
            id: item.id,
            title: item.title,
          }))
        : [],
  }));

  return {
    body,
    sections,
    outline,
  };
}
