import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

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

export function getAllDates(): string[] {
  const indexPath = join(CONTENT_DIR, "index.json");
  if (!existsSync(indexPath)) return [];
  const data = JSON.parse(readFileSync(indexPath, "utf-8"));
  return data.dates ?? [];
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

  const MONTH_NAMES = ["", "1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

  const years: YearGroup[] = [];
  for (const [year, monthMap] of yearMap) {
    const months: MonthGroup[] = [];
    for (const [month, dates] of monthMap) {
      months.push({
        year,
        month,
        label: MONTH_NAMES[parseInt(month, 10)] ?? `${month}月`,
        dates: dates.sort((a, b) => b.date.localeCompare(a.date)),
      });
    }
    months.sort((a, b) => b.month.localeCompare(a.month));
    years.push({ year, months });
  }
  years.sort((a, b) => b.year.localeCompare(a.year));
  return years;
}

export function getDailyContent(date: string): string | null {
  const filePath = join(CONTENT_DIR, date, "daily.md");
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}

export function getDailyMeta(date: string): DailyMeta | null {
  const filePath = join(CONTENT_DIR, date, "meta.json");
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

export function getPodcastScript(date: string): string | null {
  const filePath = join(CONTENT_DIR, date, "podcast-script.md");
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}

export function getDatesForMonth(year: string, month: string): string[] {
  return getAllDates().filter((d) => d.startsWith(`${year}-${month}`));
}

export function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr);
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  return Math.ceil((d.getDate() + firstDay.getDay()) / 7);
}

export function getWeeksForMonth(year: string, month: string): { week: number; dates: string[] }[] {
  const dates = getDatesForMonth(year, month);
  const weekMap = new Map<number, string[]>();

  for (const date of dates) {
    const w = getWeekNumber(date);
    if (!weekMap.has(w)) weekMap.set(w, []);
    weekMap.get(w)!.push(date);
  }

  return Array.from(weekMap.entries())
    .map(([week, dates]) => ({ week, dates: dates.sort() }))
    .sort((a, b) => b.week - a.week);
}
