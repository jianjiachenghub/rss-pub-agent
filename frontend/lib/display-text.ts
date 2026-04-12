import dayjs from "dayjs";
import type { SiteLocale } from "@/lib/locale";

const GENERIC_ISSUE_TITLE_PATTERN =
  /^(?:🗞️\s*)?(?:AI\s*日报|个人日报)\s*(?:[|｜:：\-—–]\s*)?(.*)$/i;
const GENERIC_ISSUE_TITLE_PATTERN_EN =
  /^(?:AI\s*Daily|Personal\s*Daily|Daily\s*Brief)\s*(?:[|｜:：\-—–]\s*)?(.*)$/i;

const GENERIC_ISSUE_HEADING_PATTERN =
  /^#\s*(?:🗞️\s*)?(?:AI\s*日报|个人日报)\s*(?:[|｜:：\-—–]\s*)?.*(?:\r?\n)+/;
const GENERIC_ISSUE_HEADING_PATTERN_EN =
  /^#\s*(?:AI\s*Daily|Personal\s*Daily|Daily\s*Brief)\s*(?:[|｜:：\-—–]\s*)?.*(?:\r?\n)+/i;

const CHINESE_WEEK_NUMBERS = ["一", "二", "三", "四"];

export const CATEGORY_DISPLAY_LABELS = {
  zh: {
    ai: "AI",
    tech: "科技",
    software: "软件工程",
    business: "商业",
    investment: "投资金融",
    politics: "政策地缘",
    social: "社交媒体",
  },
  en: {
    ai: "AI",
    tech: "Tech",
    software: "Software",
    business: "Business",
    investment: "Investment",
    politics: "Policy",
    social: "Social",
  },
} as const;

function buildDailyHeadline(date: string, locale: SiteLocale): string {
  if (locale === "en") {
    return `${dayjs(date).format("YYYY.MM.DD")} Brief`;
  }

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
  const d = dayjs(date);
  const dayOfMonth = d.date();
  const daysInMonth = d.daysInMonth();
  // Divide month into 4 roughly equal quarters
  const weekLength = daysInMonth / 4;
  return Math.min(Math.ceil(dayOfMonth / weekLength), 4) as 1 | 2 | 3 | 4;
}

export function getMonthScopedWeekId(date: string): string {
  const value = dayjs(date);
  return `${value.format("YYYY-MM")}-W${getMonthScopedWeekNumber(date)}`;
}

export function formatDisplayWeekLabel(
  weekId: string,
  locale: SiteLocale = "zh"
): string {
  const parsed = parseMonthScopedWeekId(weekId);
  if (!parsed) return weekId;

  if (locale === "en") {
    return `${dayjs(
      `${parsed.year}-${String(parsed.month).padStart(2, "0")}-01`
    ).format("MMM")} Week ${parsed.weekNumber}`;
  }

  return `${parsed.month}月第${getChineseWeekNumber(parsed.weekNumber)}周`;
}

export function formatCompactWeekLabel(
  weekId: string,
  locale: SiteLocale = "zh"
): string {
  const parsed = parseMonthScopedWeekId(weekId);
  if (!parsed) return weekId;

  if (locale === "en") {
    return `Week ${parsed.weekNumber}`;
  }

  return `第${getChineseWeekNumber(parsed.weekNumber)}周`;
}

export function formatMonthLabel(
  monthKey: string,
  locale: SiteLocale = "zh"
): string {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) return monthKey;

  if (locale === "en") {
    return dayjs(`${match[1]}-${match[2]}-01`).format("MMM YYYY");
  }

  return `${Number(match[2])} 月`;
}

export function getDisplayIssueTitle(
  title: string,
  date: string,
  locale: SiteLocale = "zh"
): string {
  const normalized = title.replace(/^\uFEFF/, "").trim();
  const match = normalized.match(
    locale === "en" ? GENERIC_ISSUE_TITLE_PATTERN_EN : GENERIC_ISSUE_TITLE_PATTERN
  );

  if (!match) return normalized;

  const suffix = match[1]?.trim();
  if (suffix && !/^\d{4}[-./年]/.test(suffix)) return suffix;

  return buildDailyHeadline(date, locale);
}

export function stripGenericIssueHeading(markdown: string): string {
  return markdown
    .replace(GENERIC_ISSUE_HEADING_PATTERN, "")
    .replace(GENERIC_ISSUE_HEADING_PATTERN_EN, "")
    .trim();
}

export function getCategoryDisplayLabel(
  category: string,
  locale: SiteLocale = "zh"
): string {
  return (
    CATEGORY_DISPLAY_LABELS[locale][
      category as keyof (typeof CATEGORY_DISPLAY_LABELS)["zh"]
    ] ?? category
  );
}

export function isCategoryDisplayLabel(label: string): boolean {
  return (
    Object.values(CATEGORY_DISPLAY_LABELS.zh).includes(
      label as (typeof CATEGORY_DISPLAY_LABELS.zh)[keyof typeof CATEGORY_DISPLAY_LABELS.zh]
    ) ||
    Object.values(CATEGORY_DISPLAY_LABELS.en).includes(
      label as (typeof CATEGORY_DISPLAY_LABELS.en)[keyof typeof CATEGORY_DISPLAY_LABELS.en]
    )
  );
}
