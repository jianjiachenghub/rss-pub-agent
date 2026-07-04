import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import dayjs from "dayjs";
import { CATEGORY_LABELS } from "./prompts.js";

interface ContentIndex {
  dates?: string[];
}

interface DailyMeta {
  date: string;
  itemCount: number;
  categories: string[];
  avgScore: number;
  hasPodcast: boolean;
}

export interface WeeklyDailyIssue {
  date: string;
  title: string;
  summary: string;
  keyTitles: string[];
  meta: DailyMeta | null;
}

export interface WeeklyDigestIssue {
  weekId: string;
  label: string;
  rangeLabel: string;
  latestDate: string;
  dates: string[];
  issueCount: number;
  itemCount: number;
  avgScore: number;
  categories: string[];
  summary: string;
  keyTitles: string[];
  days: WeeklyDailyIssue[];
}

export interface WeeklyDigestTextMessage {
  title: string;
  text: string;
}

export interface WeeklyDigestMarkdownMessage {
  title: string;
  markdown: string;
}

const CHINESE_WEEK_NUMBERS = ["一", "二", "三", "四"];
const DEFAULT_WEEKLY_MESSAGE_MAX_CHARS = 900;

function cleanMarkdownText(value: string): string {
  return value
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value: string, maxChars: number): string {
  const normalized = cleanMarkdownText(value);
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(1, maxChars - 1))}…`;
}

function escapeMarkdownText(value: string): string {
  return cleanMarkdownText(value).replace(/([\\[\]])/g, "\\$1");
}

function truncateMarkdownText(value: string, maxChars: number): string {
  return escapeMarkdownText(truncateText(value, maxChars));
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---[\s\S]*?---\n?/, "").trim();
}

function extractFrontmatterField(content: string, key: string): string | null {
  const match = content.match(new RegExp(`^${key}:\\s*"?(.+?)"?\\s*$`, "m"));
  return match?.[1]?.trim() || null;
}

function extractFirstHeading(body: string): string | null {
  return body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? null;
}

function extractFirstQuote(body: string): string {
  const matches = Array.from(body.matchAll(/^>\s*(.+)$/gm))
    .map((match) => cleanMarkdownText(match[1]))
    .filter(Boolean);
  return matches[0] ?? "";
}

function extractHeadingList(body: string, level: number, limit: number): string[] {
  const marker = "#".repeat(level);
  const pattern = new RegExp(`^${marker}\\s+(.+)$`, "gm");
  return Array.from(body.matchAll(pattern))
    .map((match) => cleanMarkdownText(match[1]))
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeIssueTitle(title: string, date: string): string {
  const normalized = cleanMarkdownText(title);
  const suffix = normalized
    .replace(/^(?:AI\s*日报|个人日报)\s*(?:[|｜:：\-—–]\s*)?/i, "")
    .trim();
  return suffix || `${dayjs(date).format("YYYY.MM.DD")} 要闻`;
}

function getMonthScopedWeekNumber(date: string): number {
  const value = dayjs(date);
  const weekLength = value.daysInMonth() / 4;
  return Math.min(Math.ceil(value.date() / weekLength), 4);
}

export function getMonthScopedWeekId(date: string): string {
  const value = dayjs(date);
  return `${value.format("YYYY-MM")}-W${getMonthScopedWeekNumber(date)}`;
}

function formatWeekLabel(weekId: string): string {
  const match = weekId.match(/^(\d{4})-(\d{2})-W([1-4])$/);
  if (!match) return weekId;

  const month = Number(match[2]);
  const weekNumber = Number(match[3]);
  return `${month}月第${CHINESE_WEEK_NUMBERS[weekNumber - 1] ?? weekNumber}周`;
}

function formatWeekRange(dates: string[]): string {
  const ordered = [...dates].sort();
  if (ordered.length === 0) return "";
  return `${dayjs(ordered[0]).format("MM.DD")} - ${dayjs(
    ordered[ordered.length - 1]
  ).format("MM.DD")}`;
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  if (!existsSync(filePath)) return null;
  return JSON.parse(await readFile(filePath, "utf-8")) as T;
}

async function getDailyIssue(
  contentDir: string,
  date: string
): Promise<WeeklyDailyIssue | null> {
  const dailyPath = join(contentDir, date, "daily.md");
  if (!existsSync(dailyPath)) return null;

  const content = await readFile(dailyPath, "utf-8");
  const body = stripFrontmatter(content);
  const rawTitle =
    extractFrontmatterField(content, "title") ?? extractFirstHeading(body) ?? date;
  const meta = await readJsonFile<DailyMeta>(join(contentDir, date, "meta.json"));

  return {
    date,
    title: normalizeIssueTitle(rawTitle, date),
    summary: extractFirstQuote(body),
    keyTitles: extractHeadingList(body, 3, 5),
    meta,
  };
}

export async function getWeeklyDigestIssues(
  contentDir: string
): Promise<WeeklyDigestIssue[]> {
  const index = await readJsonFile<ContentIndex>(join(contentDir, "index.json"));
  const dates = index?.dates ?? [];
  const issues = (
    await Promise.all(dates.map((date) => getDailyIssue(contentDir, date)))
  ).filter((issue): issue is WeeklyDailyIssue => issue !== null);

  const weekMap = new Map<string, WeeklyDailyIssue[]>();
  for (const issue of issues) {
    const weekId = getMonthScopedWeekId(issue.date);
    if (!weekMap.has(weekId)) weekMap.set(weekId, []);
    weekMap.get(weekId)!.push(issue);
  }

  return Array.from(weekMap.entries())
    .map(([weekId, weekIssues]) => {
      const orderedDays = [...weekIssues].sort((a, b) =>
        b.date.localeCompare(a.date)
      );
      const datesForWeek = orderedDays.map((issue) => issue.date).sort();
      const categoryCounts = new Map<string, number>();

      for (const issue of orderedDays) {
        for (const category of issue.meta?.categories ?? []) {
          categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
        }
      }

      const categories = Array.from(categoryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([category]) => category)
        .slice(0, 4);

      const itemCount = orderedDays.reduce(
        (sum, issue) => sum + (issue.meta?.itemCount ?? 0),
        0
      );
      const avgScore =
        orderedDays.length > 0
          ? Math.round(
              orderedDays.reduce(
                (sum, issue) => sum + (issue.meta?.avgScore ?? 0),
                0
              ) / orderedDays.length
            )
          : 0;

      return {
        weekId,
        label: formatWeekLabel(weekId),
        rangeLabel: formatWeekRange(datesForWeek),
        latestDate: orderedDays[0]?.date ?? "",
        dates: datesForWeek,
        issueCount: orderedDays.length,
        itemCount,
        avgScore,
        categories,
        summary: orderedDays[0]?.summary ?? "",
        keyTitles: Array.from(
          new Set(orderedDays.flatMap((issue) => issue.keyTitles))
        ).slice(0, 6),
        days: orderedDays,
      } satisfies WeeklyDigestIssue;
    })
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate));
}

export async function getWeeklyDigestIssue(
  contentDir: string,
  weekId?: string
): Promise<WeeklyDigestIssue | null> {
  const issues = await getWeeklyDigestIssues(contentDir);
  if (weekId) {
    return issues.find((issue) => issue.weekId === weekId) ?? null;
  }
  return issues[0] ?? null;
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category;
}

function buildWeeklyUrl(reportBaseUrl: string | undefined, weekId: string): string | undefined {
  const normalizedBase = reportBaseUrl?.trim().replace(/\/+$/, "");
  if (!normalizedBase) return undefined;
  return `${normalizedBase}/weekly/${weekId}`;
}

function buildOverviewMessage(
  issue: WeeklyDigestIssue,
  reportBaseUrl?: string
): WeeklyDigestTextMessage {
  const title = `个人周报 | ${issue.label}`;
  const categoryText = issue.categories.map(getCategoryLabel).join(" / ");
  const weeklyUrl = buildWeeklyUrl(reportBaseUrl, issue.weekId);
  const lines = [
    title,
    issue.rangeLabel,
    `${issue.issueCount} 份日报 · ${issue.itemCount} 条资讯 · 均分 ${issue.avgScore}`,
    categoryText ? `主题：${categoryText}` : "",
    "",
    issue.summary ? `本周判断：${truncateText(issue.summary, 180)}` : "",
    "",
    "本周重点：",
    ...issue.keyTitles.map((item, index) => `${index + 1}. ${truncateText(item, 72)}`),
    weeklyUrl ? "" : "",
    weeklyUrl ? `阅读周报：${weeklyUrl}` : "",
  ].filter((line) => line !== "");

  return { title, text: lines.join("\n").trim() };
}

function buildDailyBlock(day: WeeklyDailyIssue): string {
  const lines = [
    `${dayjs(day.date).format("YYYY.MM.DD")} · ${day.meta?.itemCount ?? 0} 条`,
    day.summary ? truncateText(day.summary, 140) : "",
    ...day.keyTitles.slice(0, 3).map((title) => `- ${truncateText(title, 64)}`),
  ].filter(Boolean);
  return lines.join("\n");
}

function buildOverviewMarkdownMessage(
  issue: WeeklyDigestIssue,
  reportBaseUrl?: string
): WeeklyDigestMarkdownMessage {
  const title = `个人周报 | ${issue.label}`;
  const categoryText = issue.categories.map(getCategoryLabel).join(" / ");
  const weeklyUrl = buildWeeklyUrl(reportBaseUrl, issue.weekId);
  const lines = [
    `**${escapeMarkdownText(title)}**`,
    escapeMarkdownText(issue.rangeLabel),
    `**${issue.issueCount}** 份日报 · **${issue.itemCount}** 条资讯 · 均分 **${issue.avgScore}**`,
    categoryText ? `主题：${escapeMarkdownText(categoryText)}` : "",
    "",
    issue.summary
      ? `**本周判断：** ${truncateMarkdownText(issue.summary, 180)}`
      : "",
    "",
    "**本周重点：**",
    ...issue.keyTitles.map(
      (item, index) => `${index + 1}. ${truncateMarkdownText(item, 72)}`
    ),
    weeklyUrl ? "" : "",
    weeklyUrl ? `[阅读周报](${weeklyUrl})` : "",
  ].filter((line) => line !== "");

  return { title, markdown: lines.join("\n").trim() };
}

function buildDailyMarkdownBlock(day: WeeklyDailyIssue): string {
  const scoreText =
    typeof day.meta?.avgScore === "number" ? ` · 均分 ${day.meta.avgScore}` : "";
  const lines = [
    `**${dayjs(day.date).format("YYYY.MM.DD")} · ${
      day.meta?.itemCount ?? 0
    } 条${scoreText}**`,
    day.summary ? `**判断：** ${truncateMarkdownText(day.summary, 140)}` : "",
    ...day.keyTitles
      .slice(0, 3)
      .map((title) => `- ${truncateMarkdownText(title, 64)}`),
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildWeeklyDigestTextMessages(
  issue: WeeklyDigestIssue,
  options: { reportBaseUrl?: string; maxChars?: number } = {}
): WeeklyDigestTextMessage[] {
  const maxChars =
    typeof options.maxChars === "number" && options.maxChars > 0
      ? Math.floor(options.maxChars)
      : DEFAULT_WEEKLY_MESSAGE_MAX_CHARS;
  const messages = [buildOverviewMessage(issue, options.reportBaseUrl)];

  let currentBlocks: string[] = [];
  const flushBlocks = () => {
    if (currentBlocks.length === 0) return;
    const title =
      messages.length === 1
        ? `个人周报 | ${issue.label} | 每日回看`
        : `个人周报 | ${issue.label} | 每日回看 ${messages.length}`;
    messages.push({
      title,
      text: [title, "", ...currentBlocks].join("\n\n").trim(),
    });
    currentBlocks = [];
  };

  for (const day of issue.days) {
    const block = buildDailyBlock(day);
    const title = `个人周报 | ${issue.label} | 每日回看`;
    const draft = [title, "", ...currentBlocks, block].join("\n\n").trim();

    if (currentBlocks.length > 0 && draft.length > maxChars) {
      flushBlocks();
    }
    currentBlocks.push(block);
  }

  flushBlocks();
  return messages;
}

export function buildWeeklyDigestMarkdownMessages(
  issue: WeeklyDigestIssue,
  options: { reportBaseUrl?: string; maxChars?: number } = {}
): WeeklyDigestMarkdownMessage[] {
  const maxChars =
    typeof options.maxChars === "number" && options.maxChars > 0
      ? Math.floor(options.maxChars)
      : DEFAULT_WEEKLY_MESSAGE_MAX_CHARS;
  const messages = [buildOverviewMarkdownMessage(issue, options.reportBaseUrl)];

  let currentBlocks: string[] = [];
  const flushBlocks = () => {
    if (currentBlocks.length === 0) return;
    const title =
      messages.length === 1
        ? `个人周报 | ${issue.label} | 每日回看`
        : `个人周报 | ${issue.label} | 每日回看 ${messages.length}`;
    messages.push({
      title,
      markdown: [
        `**${escapeMarkdownText(title)}**`,
        "",
        ...currentBlocks,
      ]
        .join("\n\n")
        .trim(),
    });
    currentBlocks = [];
  };

  for (const day of issue.days) {
    const block = buildDailyMarkdownBlock(day);
    const title = `个人周报 | ${issue.label} | 每日回看`;
    const draft = [
      `**${escapeMarkdownText(title)}**`,
      "",
      ...currentBlocks,
      block,
    ]
      .join("\n\n")
      .trim();

    if (currentBlocks.length > 0 && draft.length > maxChars) {
      flushBlocks();
    }
    currentBlocks.push(block);
  }

  flushBlocks();
  return messages;
}
