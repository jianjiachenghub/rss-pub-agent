import dayjs from "dayjs";

const GENERIC_ISSUE_TITLE_PATTERN =
  /^(?:🗞️\s*)?(?:AI\s*日报|个人日报)\s*(?:[|｜:：\-–—]\s*)?(.*)$/i;

const GENERIC_ISSUE_HEADING_PATTERN =
  /^#\s*(?:🗞️\s*)?(?:AI\s*日报|个人日报)\s*(?:[|｜:：\-–—]\s*)?.*(?:\r?\n)+/;

function buildDailyHeadline(date: string): string {
  return `${dayjs(date).format("YYYY.MM.DD")} 要闻`;
}

export function formatDisplayWeekLabel(weekId: string): string {
  const [year, week] = weekId.split("-W");
  if (!year || !week) return weekId;
  return `${year} 第${Number(week)}周`;
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
