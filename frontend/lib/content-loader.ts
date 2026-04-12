import { existsSync, readFileSync } from "fs";
import { join } from "path";
import dayjs from "dayjs";
import {
  formatDisplayWeekLabel,
  getMonthScopedWeekId,
  getMonthScopedWeekNumber,
  getDisplayIssueTitle,
} from "@/lib/display-text";
import type { SiteLocale } from "@/lib/locale";

const CONTENT_DIR = join(process.cwd(), "../content");

export interface DailyMeta {
  date: string;
  itemCount: number;
  categories: string[];
  avgScore: number;
  hasPodcast: boolean;
}

export interface DateEntry {
  date: string;
  year: string;
  month: string;
  day: string;
}

export interface MonthGroup {
  year: string;
  month: string;
  label: string;
  dates: DateEntry[];
}

export interface YearGroup {
  year: string;
  months: MonthGroup[];
}

export interface DailyIssue {
  date: string;
  title: string;
  content: string;
  body: string;
  summary: string;
  heroImageUrl?: string;
  keyTitles: string[];
  watchSignals: string[];
  meta: DailyMeta | null;
}

export interface WeeklyIssue {
  weekId: string;
  year: string;
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
  heroImageUrl?: string;
  days: DailyIssue[];
}

export interface TimelineDay {
  date: string;
  title: string;
  summary: string;
  keyTitles: string[];
  heroImageUrl?: string;
}

function readJsonFile<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8")) as T;
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---[\s\S]*?---\n?/, "").trim();
}

function normalizePreviewText(text: string): string {
  return text
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFrontmatterField(content: string, key: string): string | null {
  const pattern = new RegExp(`^${key}:\\s*"?(.*?)"?$`, "m");
  const match = content.match(pattern);
  return match?.[1]?.trim() || null;
}

function extractFirstHeading(body: string): string | null {
  const match = body.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || null;
}

function extractFirstQuote(body: string): string {
  const matches = Array.from(body.matchAll(/^>\s*(.+)$/gm))
    .map((match) => normalizePreviewText(match[1]))
    .filter(Boolean);
  return matches[0] ?? "";
}

function extractHeroImage(body: string): string | undefined {
  const match = body.match(/^!\[[^\]]*]\(([^)]+)\)$/m);
  return match?.[1]?.trim() || undefined;
}

function extractHeadingList(body: string, level: number, limit: number): string[] {
  const marker = "#".repeat(level);
  const pattern = new RegExp(`^${marker}\\s+(.+)$`, "gm");
  const headings = Array.from(body.matchAll(pattern))
    .map((match) => normalizePreviewText(match[1]))
    .filter(Boolean);
  return headings.slice(0, limit);
}

function extractWatchSignals(body: string): string[] {
  const matches = Array.from(
    body.matchAll(/(?:^|\n)((?:- (?!\[).+(?:\n|$)){2,})/gm)
  );
  const cluster = matches.at(-1)?.[1] ?? "";
  return cluster
    .split("\n")
    .map((line) => normalizePreviewText(line.replace(/^- /, "")))
    .filter(Boolean)
    .slice(0, 5);
}

function getWeekId(date: string): string {
  return getMonthScopedWeekId(date);
}

function formatWeekLabel(weekId: string, locale: SiteLocale): string {
  return formatDisplayWeekLabel(weekId, locale);
}

function formatWeekRange(dates: string[]): string {
  const ordered = [...dates].sort();
  if (ordered.length === 0) return "";
  const start = dayjs(ordered[0]).format("MM.DD");
  const end = dayjs(ordered[ordered.length - 1]).format("MM.DD");
  return `${start} - ${end}`;
}

function getIssueTitle(
  content: string,
  date: string,
  locale: SiteLocale = "zh"
): string {
  const rawTitle =
    extractFrontmatterField(content, "title") ??
    extractFirstHeading(stripFrontmatter(content)) ??
    date;

  return getDisplayIssueTitle(rawTitle, date, locale);
}

function getContentPath(date: string, fileName: string): string {
  return join(CONTENT_DIR, date, fileName);
}

export function getAllDates(): string[] {
  const index = readJsonFile<{ dates?: string[] }>(join(CONTENT_DIR, "index.json"));
  return index?.dates ?? [];
}

export function getDateEntries(): DateEntry[] {
  return getAllDates().map((date) => {
    const [year, month, day] = date.split("-");
    return { date, year, month, day };
  });
}

export function getGroupedByYear(): YearGroup[] {
  const entries = getDateEntries();
  const yearMap = new Map<string, Map<string, DateEntry[]>>();

  for (const entry of entries) {
    if (!yearMap.has(entry.year)) yearMap.set(entry.year, new Map());
    const monthMap = yearMap.get(entry.year)!;
    if (!monthMap.has(entry.month)) monthMap.set(entry.month, []);
    monthMap.get(entry.month)!.push(entry);
  }

  const monthNames = [
    "",
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  const years: YearGroup[] = [];
  for (const [year, monthMap] of yearMap) {
    const months: MonthGroup[] = [];
    for (const [month, dates] of monthMap) {
      months.push({
        year,
        month,
        label: monthNames[Number(month)] ?? month,
        dates: [...dates].sort((a, b) => b.date.localeCompare(a.date)),
      });
    }
    months.sort((a, b) => b.month.localeCompare(a.month));
    years.push({ year, months });
  }

  years.sort((a, b) => b.year.localeCompare(a.year));
  return years;
}

export function getDailyContent(
  date: string,
  locale: SiteLocale = "zh"
): string | null {
  const fileNames =
    locale === "en" ? ["daily.en.md", "daily.md"] : ["daily.md"];

  for (const fileName of fileNames) {
    const filePath = getContentPath(date, fileName);
    if (existsSync(filePath)) {
      return readFileSync(filePath, "utf-8");
    }
  }

  return null;
}

export function getDailyMeta(date: string): DailyMeta | null {
  return readJsonFile<DailyMeta>(getContentPath(date, "meta.json"));
}

export function getPodcastScript(
  date: string,
  locale: SiteLocale = "zh"
): string | null {
  const fileNames =
    locale === "en"
      ? ["podcast-script.en.md", "podcast-script.md"]
      : ["podcast-script.md"];

  for (const fileName of fileNames) {
    const filePath = getContentPath(date, fileName);
    if (existsSync(filePath)) {
      return readFileSync(filePath, "utf-8");
    }
  }

  return null;
}

export function getDailyIssue(
  date: string,
  locale: SiteLocale = "zh"
): DailyIssue | null {
  const content = getDailyContent(date, locale);
  if (!content) return null;

  const body = stripFrontmatter(content);
  const summary = extractFirstQuote(body);
  return {
    date,
    title: getIssueTitle(content, date, locale),
    content,
    body,
    summary,
    heroImageUrl: extractHeroImage(body),
    keyTitles: extractHeadingList(body, 3, 5),
    watchSignals: extractWatchSignals(body),
    meta: getDailyMeta(date),
  };
}

export function getAllDailyIssues(locale: SiteLocale = "zh"): DailyIssue[] {
  return getAllDates()
    .map((date) => getDailyIssue(date, locale))
    .filter((issue): issue is DailyIssue => issue !== null);
}

export function getLatestDailyIssue(locale: SiteLocale = "zh"): DailyIssue | null {
  return getDailyIssue(getAllDates()[0] ?? "", locale);
}

export function getDatesForMonth(year: string, month: string): string[] {
  return getAllDates().filter((date) => date.startsWith(`${year}-${month}`));
}

export function getWeeksForMonth(
  year: string,
  month: string
): { week: number; dates: string[] }[] {
  const weekMap = new Map<number, string[]>();
  for (const date of getDatesForMonth(year, month)) {
    const week = getMonthScopedWeekNumber(date);
    if (!weekMap.has(week)) weekMap.set(week, []);
    weekMap.get(week)!.push(date);
  }

  return Array.from(weekMap.entries())
    .map(([week, dates]) => ({ week, dates: dates.sort() }))
    .sort((a, b) => b.week - a.week);
}

export function getWeeklyIssues(locale: SiteLocale = "zh"): WeeklyIssue[] {
  const issues = getAllDailyIssues(locale);
  const weekMap = new Map<string, DailyIssue[]>();

  for (const issue of issues) {
    const weekId = getWeekId(issue.date);
    if (!weekMap.has(weekId)) weekMap.set(weekId, []);
    weekMap.get(weekId)!.push(issue);
  }

  return Array.from(weekMap.entries())
    .map(([weekId, weekIssues]) => {
      const orderedDays = [...weekIssues].sort((a, b) =>
        b.date.localeCompare(a.date)
      );
      const latest = orderedDays[0];
      const dates = orderedDays.map((issue) => issue.date).sort();
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

      const keyTitles = Array.from(
        new Set(orderedDays.flatMap((issue) => issue.keyTitles))
      ).slice(0, 6);

      return {
        weekId,
        year: weekId.slice(0, 4),
        label: formatWeekLabel(weekId, locale),
        rangeLabel: formatWeekRange(dates),
        latestDate: latest?.date ?? "",
        dates,
        issueCount: orderedDays.length,
        itemCount,
        avgScore,
        categories,
        summary: latest?.summary ?? "",
        keyTitles,
        heroImageUrl: orderedDays.find((issue) => issue.heroImageUrl)?.heroImageUrl,
        days: orderedDays,
      } satisfies WeeklyIssue;
    })
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate));
}

export function getWeeklyIssue(
  weekId: string,
  locale: SiteLocale = "zh"
): WeeklyIssue | null {
  return getWeeklyIssues(locale).find((issue) => issue.weekId === weekId) ?? null;
}

export function getTimelineDays(
  limit?: number,
  locale: SiteLocale = "zh"
): TimelineDay[] {
  const items = getAllDailyIssues(locale).map((issue) => ({
    date: issue.date,
    title: issue.title,
    summary: issue.summary,
    keyTitles: issue.keyTitles.slice(0, 4),
    heroImageUrl: issue.heroImageUrl,
  }));

  return typeof limit === "number" ? items.slice(0, limit) : items;
}
