import { stripGenericIssueHeading } from "@/lib/display-text";

export interface DailyReportItem {
  id: string;
  title: string;
  shortTitle: string;
  content: string;
}

export interface DailyReportSection {
  id: string;
  title: string;
  shortTitle: string;
  content: string;
  items: DailyReportItem[];
}

export interface ParsedDailyReport {
  body: string;
  sections: DailyReportSection[];
  outline: Array<{
    id: string;
    title: string;
    shortTitle: string;
    items: Array<{
      id: string;
      title: string;
      shortTitle: string;
    }>;
  }>;
}

interface ItemBuilder {
  id: string;
  title: string;
  shortTitle: string;
  contentLines: string[];
}

interface SectionBuilder {
  id: string;
  title: string;
  shortTitle: string;
  contentLines: string[];
  items: DailyReportItem[];
}

function trimBlock(value: string): string {
  return value.replace(/^\s+|\s+$/g, "");
}

export function extractDailyReportBody(content: string): string {
  return stripGenericIssueHeading(
    content.replace(/^---[\s\S]*?---\n?/, "").trim()
  );
}

export function truncateOutlineLabel(value: string, limit = 18): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}...`;
}

export function parseDailyReport(content: string): ParsedDailyReport {
  const body = extractDailyReportBody(content);
  const lines = body.split(/\r?\n/);
  const sections: DailyReportSection[] = [];

  let currentSection: SectionBuilder | null = null;
  let currentItem: ItemBuilder | null = null;

  const flushItem = () => {
    if (!currentSection || !currentItem) return;
    currentSection.items.push({
      id: currentItem.id,
      title: currentItem.title,
      shortTitle: currentItem.shortTitle,
      content: trimBlock(currentItem.contentLines.join("\n")),
    });
    currentItem = null;
  };

  const flushSection = () => {
    if (!currentSection) return;
    flushItem();
    sections.push({
      id: currentSection.id,
      title: currentSection.title,
      shortTitle: currentSection.shortTitle,
      content: trimBlock(currentSection.contentLines.join("\n")),
      items: currentSection.items,
    });
    currentSection = null;
  };

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      flushSection();
      const sectionIndex = sections.length + 1;
      const title = h2Match[1].trim();
      currentSection = {
        id: `section-${sectionIndex}`,
        title,
        shortTitle: truncateOutlineLabel(title, 12),
        contentLines: [],
        items: [],
      };
      continue;
    }

    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match && currentSection) {
      flushItem();
      const itemIndex = currentSection.items.length + 1;
      const title = h3Match[1].trim();
      currentItem = {
        id: `item-${sections.length + 1}-${itemIndex}`,
        title,
        shortTitle: truncateOutlineLabel(title),
        contentLines: [],
      };
      continue;
    }

    if (currentItem) {
      currentItem.contentLines.push(line);
      continue;
    }

    if (currentSection) {
      currentSection.contentLines.push(line);
    }
  }

  flushSection();

  return {
    body,
    sections,
    outline: sections
      .filter((section) => section.items.length > 0)
      .map((section) => ({
        id: section.id,
        title: section.title,
        shortTitle: section.shortTitle,
        items: section.items.map((item) => ({
          id: item.id,
          title: item.title,
          shortTitle: item.shortTitle,
        })),
      })),
  };
}
