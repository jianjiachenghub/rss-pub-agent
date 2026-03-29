import dayjs from "dayjs";

const GENERIC_ISSUE_TITLE_PATTERN =
  /^(?:🗞️\s*)?(?:AI\s*日报|个人日报)\s*(?:[|｜:：\-—–]\s*)?(.*)$/i;

const GENERIC_ISSUE_HEADING_PATTERN =
  /^#\s*(?:🗞️\s*)?(?:AI\s*日报|个人日报)\s*(?:[|｜:：\-—–]\s*)?.*(?:\r?\n)+/;

const CHINESE_WEEK_NUMBERS = ["一", "二", "三", "四"];

export const CATEGORY_DISPLAY_LABELS = {
  ai: "AI",
  tech: "科技",
  software: "软件工程",
  business: "商业",
  investment: "投资金融",
  politics: "政策地缘",
  social: "社区舆情",
} as const;

function buildDailyHeadline(date: string): string {
  return `${dayjs(date).format("YYYY.MM.DD")} 要闻`;
}

function getChineseWeekNumber(weekNumber: number): string {
  return CHINESE_WEEK_NUMBERS[Math.min(Math.max(weekNumber, 1), 4) - 1] ?? "一";
}

function parseMonthScopedWeekId(weekId: string) {
  const match = weekId.match(/^(\d{4})-(\d{2})-W([1-4])$/);
  if (!match) return null;

  return {
    year: match[1],
    month: Number(match[2]),
    weekNumber: Number(match[3]),
  };
}

export function getMonthScopedWeekNumber(date: string): number {
  const dayOfMonth = dayjs(date).date();
  return Math.min(Math.ceil(dayOfMonth / 7), 4);
}

export function getMonthScopedWeekId(date: string): string {
  const value = dayjs(date);
  return `${value.format("YYYY-MM")}-W${getMonthScopedWeekNumber(date)}`;
}

export function formatDisplayWeekLabel(weekId: string): string {
  const parsed = parseMonthScopedWeekId(weekId);
  if (!parsed) return weekId;

  return `${parsed.month}月第${getChineseWeekNumber(parsed.weekNumber)}周`;
}

export function formatCompactWeekLabel(weekId: string): string {
  const parsed = parseMonthScopedWeekId(weekId);
  if (!parsed) return weekId;

  return `第${getChineseWeekNumber(parsed.weekNumber)}周`;
}

export function formatMonthLabel(monthKey: string): string {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) return monthKey;

  return `${Number(match[2])} 月`;
}

export function getDisplayIssueTitle(title: string, date: string): string {
  const normalized = title.replace(/^\uFEFF/, "").trim();
  const match = normalized.match(GENERIC_ISSUE_TITLE_PATTERN);

  if (!match) return normalized;

  const suffix = match[1]?.trim();
  if (suffix && !/^\d{4}[-./年]/.test(suffix)) return suffix;

  return buildDailyHeadline(date);
}

export function stripGenericIssueHeading(markdown: string): string {
  return markdown.replace(GENERIC_ISSUE_HEADING_PATTERN, "").trim();
}

export function getCategoryDisplayLabel(category: string): string {
  return CATEGORY_DISPLAY_LABELS[category as keyof typeof CATEGORY_DISPLAY_LABELS] ?? category;
}

export function isCategoryDisplayLabel(label: string): boolean {
  return Object.values(CATEGORY_DISPLAY_LABELS).includes(
    label as (typeof CATEGORY_DISPLAY_LABELS)[keyof typeof CATEGORY_DISPLAY_LABELS]
  );
}
