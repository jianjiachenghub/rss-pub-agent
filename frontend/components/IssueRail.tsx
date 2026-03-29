import Link from "next/link";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import type { DailyIssue, WeeklyIssue } from "@/lib/content-loader";
import {
  formatCompactWeekLabel,
  formatMonthLabel,
  getMonthScopedWeekId,
} from "@/lib/display-text";

interface IssueRailProps {
  dailyIssues: DailyIssue[];
  weeklyIssues: WeeklyIssue[];
  currentDate?: string;
  currentWeekId?: string;
  compact?: boolean;
}

interface ArchiveWeekGroup {
  weekId: string;
  label: string;
  rangeLabel: string;
  latestDate: string;
  issueCount: number;
  dailyIssues: DailyIssue[];
  weeklyIssue?: WeeklyIssue;
}

interface ArchiveMonthGroup {
  key: string;
  label: string;
  latestDate: string;
  issueCount: number;
  weeks: ArchiveWeekGroup[];
}

interface ArchiveYearGroup {
  year: string;
  latestDate: string;
  issueCount: number;
  months: ArchiveMonthGroup[];
}

function formatWeekRange(dates: string[]): string {
  const ordered = [...dates].sort();
  if (ordered.length === 0) return "";
  const lastDate = ordered[ordered.length - 1];

  return `${dayjs(ordered[0]).format("MM.DD")} - ${dayjs(lastDate).format("MM.DD")}`;
}

function buildArchiveTree(
  dailyIssues: DailyIssue[],
  weeklyIssues: WeeklyIssue[]
): ArchiveYearGroup[] {
  const weeklyMap = new Map(weeklyIssues.map((issue) => [issue.weekId, issue]));
  const yearMap = new Map<string, Map<string, Map<string, DailyIssue[]>>>();

  for (const issue of dailyIssues) {
    const value = dayjs(issue.date);
    const year = value.format("YYYY");
    const monthKey = value.format("YYYY-MM");
    const weekId = getMonthScopedWeekId(issue.date);

    if (!yearMap.has(year)) yearMap.set(year, new Map());

    const monthMap = yearMap.get(year)!;
    if (!monthMap.has(monthKey)) monthMap.set(monthKey, new Map());

    const weekMap = monthMap.get(monthKey)!;
    if (!weekMap.has(weekId)) weekMap.set(weekId, []);

    weekMap.get(weekId)!.push(issue);
  }

  return Array.from(yearMap.entries())
    .map(([year, monthMap]) => {
      const months = Array.from(monthMap.entries())
        .map(([monthKey, weekMap]) => {
          const weeks = Array.from(weekMap.entries())
            .map(([weekId, monthWeekIssues]) => {
              const orderedDays = [...monthWeekIssues].sort((a, b) =>
                b.date.localeCompare(a.date)
              );
              const weeklyIssue = weeklyMap.get(weekId);

              return {
                weekId,
                label: formatCompactWeekLabel(weekId),
                rangeLabel:
                  weeklyIssue?.rangeLabel ??
                  formatWeekRange(orderedDays.map((issue) => issue.date)),
                latestDate: orderedDays[0]?.date ?? "",
                issueCount: orderedDays.length,
                dailyIssues: orderedDays,
                weeklyIssue,
              } satisfies ArchiveWeekGroup;
            })
            .sort((a, b) => b.latestDate.localeCompare(a.latestDate));

          return {
            key: monthKey,
            label: formatMonthLabel(monthKey),
            latestDate: weeks[0]?.latestDate ?? `${monthKey}-01`,
            issueCount: weeks.reduce((sum, week) => sum + week.issueCount, 0),
            weeks,
          } satisfies ArchiveMonthGroup;
        })
        .sort((a, b) => b.key.localeCompare(a.key));

      return {
        year,
        latestDate: months[0]?.latestDate ?? `${year}-01-01`,
        issueCount: months.reduce((sum, month) => sum + month.issueCount, 0),
        months,
      } satisfies ArchiveYearGroup;
    })
    .sort((a, b) => b.year.localeCompare(a.year));
}

function IssueStamp({
  children,
  active,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <span className={`issue-stamp ${active ? "issue-stamp-active" : ""}`}>
      {children}
    </span>
  );
}

function DisclosureChevron() {
  return (
    <span className="rail-chevron" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none">
        <path
          d="M4.25 6.25L8 10L11.75 6.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.35"
        />
      </svg>
    </span>
  );
}

export default function IssueRail({
  dailyIssues,
  weeklyIssues,
  currentDate,
  currentWeekId,
  compact = false,
}: IssueRailProps) {
  const archiveTree = buildArchiveTree(dailyIssues, weeklyIssues);
  const currentWeeklyIssue = weeklyIssues.find((issue) => issue.weekId === currentWeekId);
  const focusDate = currentDate ?? currentWeeklyIssue?.latestDate ?? dailyIssues[0]?.date;
  const focusYear = focusDate ? dayjs(focusDate).format("YYYY") : undefined;
  const focusMonthKey = focusDate ? dayjs(focusDate).format("YYYY-MM") : undefined;
  const focusWeekId = currentWeekId ?? (focusDate ? getMonthScopedWeekId(focusDate) : undefined);
  const latestYear = archiveTree[0]?.year;
  const latestMonthKey = archiveTree[0]?.months[0]?.key;
  const latestWeekId = archiveTree[0]?.months[0]?.weeks[0]?.weekId;

  return (
    <div className={`rail-tree ${compact ? "space-y-5" : "space-y-6"}`}>
      <section className="space-y-4">
        <div className="rail-label">刊期导航</div>

        {archiveTree.map((yearGroup) => {
          const yearActive = yearGroup.year === focusYear;
          const yearOpen = yearActive || yearGroup.year === latestYear;

          return (
            <details key={yearGroup.year} open={yearOpen} className="rail-tier rail-tier-year">
              <summary className={`rail-head ${yearActive ? "is-active" : ""}`}>
                <div className="rail-head-main">
                  <DisclosureChevron />
                  <div className="rail-copy">
                    <div className="rail-kicker">YEAR</div>
                    <div className="rail-title rail-title-year">{yearGroup.year}</div>
                  </div>
                </div>
                <IssueStamp active={yearActive}>{yearGroup.issueCount}</IssueStamp>
              </summary>

              <div className="rail-children rail-children-year">
                {yearGroup.months.map((monthGroup) => {
                  const monthActive = monthGroup.key === focusMonthKey;
                  const monthOpen = monthActive || monthGroup.key === latestMonthKey;

                  return (
                    <details
                      key={monthGroup.key}
                      open={monthOpen}
                      className="rail-tier rail-tier-month"
                    >
                      <summary className={`rail-head ${monthActive ? "is-active" : ""}`}>
                        <div className="rail-head-main">
                          <DisclosureChevron />
                          <div className="rail-copy">
                            <div className="rail-kicker">MONTH</div>
                            <div className="rail-title">{monthGroup.label}</div>
                          </div>
                        </div>
                        <IssueStamp active={monthActive}>{monthGroup.issueCount}</IssueStamp>
                      </summary>

                      <div className="rail-children rail-children-month">
                        {monthGroup.weeks.map((weekGroup) => {
                          const weekActive = weekGroup.weekId === focusWeekId;
                          const weekOpen = weekActive || weekGroup.weekId === latestWeekId;

                          return (
                            <details
                              key={weekGroup.weekId}
                              open={weekOpen}
                              className="rail-tier rail-tier-week"
                            >
                              <summary className={`rail-head ${weekActive ? "is-active" : ""}`}>
                                <div className="rail-head-main">
                                  <DisclosureChevron />
                                  <div className="rail-copy">
                                    <div className="rail-kicker">WEEK</div>
                                    <div className="rail-title">{weekGroup.label}</div>
                                    <div className="rail-meta">{weekGroup.rangeLabel}</div>
                                  </div>
                                </div>
                                <IssueStamp active={weekActive}>{weekGroup.issueCount}</IssueStamp>
                              </summary>

                              <div className="rail-children rail-children-day">
                                {weekGroup.weeklyIssue ? (
                                  <Link
                                    href={`/weekly/${weekGroup.weekId}`}
                                    className={`rail-week-link ${
                                      currentWeekId === weekGroup.weekId ? "is-active" : ""
                                    }`}
                                  >
                                    <div className="rail-week-link-kicker">周报</div>
                                    <div className="rail-week-link-title">
                                      {weekGroup.weeklyIssue.label}
                                    </div>
                                  </Link>
                                ) : null}

                                <div className="rail-day-list">
                                  {weekGroup.dailyIssues.map((issue) => {
                                    const active = issue.date === currentDate;
                                    const hasImage = Boolean(issue.heroImageUrl);
                                    const hasPodcast = issue.meta?.hasPodcast ?? false;

                                    return (
                                      <Link
                                        key={issue.date}
                                        href={`/${issue.date}`}
                                        className={`rail-day-card ${active ? "is-active" : ""}`}
                                      >
                                        <div className="rail-day-title">{issue.title}</div>
                                        <div className="rail-day-footer">
                                          {issue.meta ? (
                                            <span className="rail-day-stat">
                                              {issue.meta.itemCount} 条资讯
                                            </span>
                                          ) : null}
                                          {issue.meta ? (
                                            <span className="rail-day-stat">
                                              均分 {issue.meta.avgScore}
                                            </span>
                                          ) : null}
                                          {hasImage ? (
                                            <span className="rail-day-stat">图片</span>
                                          ) : null}
                                          {hasPodcast ? (
                                            <span className="rail-day-stat">播客</span>
                                          ) : null}
                                        </div>
                                      </Link>
                                    );
                                  })}
                                </div>
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
