import Link from "next/link";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import type { ReactNode } from "react";
import type { DailyIssue, WeeklyIssue } from "@/lib/content-loader";
import { formatDisplayWeekLabel } from "@/lib/display-text";

dayjs.extend(isoWeek);

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

function getIssueWeekId(date: string): string {
  const value = dayjs(date);
  return `${value.isoWeekYear()}-W${String(value.isoWeek()).padStart(2, "0")}`;
}

function formatWeekLabel(weekId: string): string {
  return formatDisplayWeekLabel(weekId);
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
    const weekId = getIssueWeekId(issue.date);

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
                label: weeklyIssue?.label ?? formatWeekLabel(weekId),
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
            label: dayjs(`${monthKey}-01`).format("MMM").toUpperCase(),
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
  const focusWeekId = currentWeekId ?? (focusDate ? getIssueWeekId(focusDate) : undefined);
  const latestYear = archiveTree[0]?.year;
  const latestMonthKey = archiveTree[0]?.months[0]?.key;
  const latestWeekId = archiveTree[0]?.months[0]?.weeks[0]?.weekId;

  return (
    <div className={`text-[13px] text-stone-700 ${compact ? "space-y-6" : "space-y-7"}`}>
      <section className="space-y-4">
        <div className="rail-label">资讯归档</div>

        {archiveTree.map((yearGroup) => {
          const yearActive = yearGroup.year === focusYear;
          const yearOpen = yearActive || yearGroup.year === latestYear;

          return (
            <details
              key={yearGroup.year}
              open={yearOpen}
              className="rail-panel group"
            >
              <summary
                className={`rail-summary rail-summary-year ${yearActive ? "is-active" : ""}`}
              >
                <div>
                  <div
                    className={`font-mono text-[10px] uppercase tracking-[0.28em] ${
                      yearActive ? "text-white/65" : "text-black/40"
                    }`}
                  >
                    Year
                  </div>
                  <div
                    className={`mt-1 text-[16px] font-semibold tracking-[0.2em] ${
                      yearActive ? "text-white" : "text-black"
                    }`}
                  >
                    {yearGroup.year}
                  </div>
                </div>
                <IssueStamp active={yearActive}>{yearGroup.issueCount}</IssueStamp>
              </summary>

              <div className="border-t border-black/10">
                {yearGroup.months.map((monthGroup) => {
                  const monthActive = monthGroup.key === focusMonthKey;
                  const monthOpen = monthActive || monthGroup.key === latestMonthKey;

                  return (
                    <details
                      key={monthGroup.key}
                      open={monthOpen}
                      className="border-b border-black/8 last:border-b-0"
                    >
                      <summary
                        className={`rail-summary rail-summary-month ${monthActive ? "is-active" : ""}`}
                      >
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/38">
                            Month
                          </div>
                          <div className="mt-1 text-[13px] font-semibold tracking-[0.22em] text-black">
                            {monthGroup.label}
                          </div>
                        </div>
                        <IssueStamp active={monthActive}>{monthGroup.issueCount}</IssueStamp>
                      </summary>

                      <div className="border-t border-black/8 bg-white">
                        {monthGroup.weeks.map((weekGroup) => {
                          const weekActive = weekGroup.weekId === focusWeekId;
                          const weekOpen = weekActive || weekGroup.weekId === latestWeekId;

                          return (
                            <details
                              key={weekGroup.weekId}
                              open={weekOpen}
                              className="border-b border-black/8 last:border-b-0"
                            >
                              <summary
                                className={`rail-summary rail-summary-week ${weekActive ? "is-active" : ""}`}
                              >
                                <div>
                                  <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/40">
                                    {weekGroup.rangeLabel}
                                  </div>
                                  <div className="mt-1 text-[12px] font-semibold tracking-[0.16em] text-black">
                                    {weekGroup.label}
                                  </div>
                                </div>
                                <IssueStamp active={weekActive}>{weekGroup.issueCount}</IssueStamp>
                              </summary>

                              <div className="border-t border-black/8 bg-[#fdfcf9]">
                                {weekGroup.weeklyIssue ? (
                                  <Link
                                    href={`/weekly/${weekGroup.weekId}`}
                                    className={`rail-feature-link ${
                                      currentWeekId === weekGroup.weekId ? "is-active" : ""
                                    }`}
                                  >
                                    <div
                                      className={`font-mono text-[10px] uppercase tracking-[0.28em] ${
                                        currentWeekId === weekGroup.weekId
                                          ? "text-white/65"
                                          : "text-black/42"
                                      }`}
                                    >
                                      本周综览
                                    </div>
                                    <div
                                      className={`rail-entry-title mt-1 text-sm font-semibold leading-snug ${
                                        currentWeekId === weekGroup.weekId
                                          ? "text-white"
                                          : "text-black"
                                      }`}
                                    >
                                      {weekGroup.weeklyIssue.label}
                                    </div>
                                  </Link>
                                ) : null}

                                {weekGroup.dailyIssues.map((issue) => {
                                  const active = issue.date === currentDate;
                                  const hasImage = Boolean(issue.heroImageUrl);
                                  const hasPodcast = issue.meta?.hasPodcast ?? false;

                                  return (
                                    <Link
                                      key={issue.date}
                                      href={`/${issue.date}`}
                                      className={`rail-entry ${active ? "is-active" : ""}`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div
                                            className={`font-mono text-[10px] uppercase tracking-[0.28em] ${
                                              active ? "text-white/65" : "text-black/45"
                                            }`}
                                          >
                                            {dayjs(issue.date).format("MM.DD")}
                                          </div>
                                          <div
                                            className={`rail-entry-title mt-1 text-sm font-semibold leading-snug ${
                                              active ? "text-white" : "text-black"
                                            }`}
                                          >
                                            {issue.title}
                                          </div>
                                        </div>
                                        <div className="flex shrink-0 gap-1">
                                          {hasImage ? (
                                            <IssueStamp active={active}>IMG</IssueStamp>
                                          ) : null}
                                          {hasPodcast ? (
                                            <IssueStamp active={active}>POD</IssueStamp>
                                          ) : null}
                                        </div>
                                      </div>
                                      <div
                                        className={`mt-2 line-clamp-2 text-xs leading-5 ${
                                          active ? "text-white/78" : "text-black/60"
                                        }`}
                                      >
                                        {issue.summary ||
                                          "打开查看当日完整内容。"}
                                      </div>
                                    </Link>
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
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
