import Link from "next/link";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import type { DailyIssue, WeeklyIssue } from "@/lib/content-loader";

interface IssueRailProps {
  dailyIssues: DailyIssue[];
  weeklyIssues: WeeklyIssue[];
  currentDate?: string;
  currentWeekId?: string;
  compact?: boolean;
}

interface DailyMonthGroup {
  key: string;
  year: string;
  month: string;
  issues: DailyIssue[];
}

function groupDailyIssuesByMonth(dailyIssues: DailyIssue[]): DailyMonthGroup[] {
  const monthMap = new Map<string, DailyMonthGroup>();

  for (const issue of dailyIssues) {
    const value = dayjs(issue.date);
    const key = value.format("YYYY-MM");
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        key,
        year: value.format("YYYY"),
        month: value.format("MMM").toUpperCase(),
        issues: [],
      });
    }
    monthMap.get(key)!.issues.push(issue);
  }

  return Array.from(monthMap.values())
    .map((group) => ({
      ...group,
      issues: group.issues.sort((a, b) => b.date.localeCompare(a.date)),
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

function IssueStamp({
  children,
  active,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={`inline-flex min-w-11 items-center justify-center border px-2 py-1 text-[10px] tracking-[0.25em] ${
        active ? "border-black bg-black text-white" : "border-black/20 text-black/55"
      }`}
    >
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
  const dailyByMonth = groupDailyIssuesByMonth(dailyIssues);

  return (
    <div className="space-y-8 text-[13px] text-stone-700">
      <section className="space-y-3">
        <div className="rail-label">Weekly Issues</div>
        <div className="space-y-2">
          {weeklyIssues.slice(0, compact ? 4 : 8).map((issue) => {
            const active = issue.weekId === currentWeekId;
            return (
              <Link
                key={issue.weekId}
                href={`/weekly/${issue.weekId}`}
                className={`block border px-3 py-3 transition-colors ${
                  active
                    ? "border-black bg-black text-white"
                    : "border-black/15 bg-white hover:border-black hover:bg-stone-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div
                      className={`font-mono text-[10px] uppercase tracking-[0.28em] ${
                        active ? "text-white/70" : "text-black/45"
                      }`}
                    >
                      {issue.rangeLabel}
                    </div>
                    <div
                      className={`mt-1 text-[12px] font-semibold tracking-[0.18em] ${
                        active ? "text-white" : "text-black"
                      }`}
                    >
                      {issue.label}
                    </div>
                  </div>
                  <IssueStamp active={active}>{issue.issueCount}</IssueStamp>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="rail-label">Daily Archive</div>
        {dailyByMonth.map((group, index) => {
          const open = index < (compact ? 2 : 4);
          return (
            <details
              key={group.key}
              open={open}
              className="group border border-black/10 bg-white"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3 list-none">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.28em] text-black/40">
                    {group.year}
                  </div>
                  <div className="mt-1 text-[14px] font-semibold tracking-[0.2em] text-black">
                    {group.month}
                  </div>
                </div>
                <IssueStamp>{group.issues.length}</IssueStamp>
              </summary>
              <div className="border-t border-black/10">
                {group.issues.map((issue) => {
                  const active = issue.date === currentDate;
                  const hasImage = Boolean(issue.heroImageUrl);
                  const hasPodcast = issue.meta?.hasPodcast ?? false;

                  return (
                    <Link
                      key={issue.date}
                      href={`/${issue.date}`}
                      className={`block border-b border-black/8 px-3 py-3 transition-colors last:border-b-0 ${
                        active
                          ? "bg-black text-white"
                          : "bg-white hover:bg-stone-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div
                            className={`font-mono text-[10px] uppercase tracking-[0.28em] ${
                              active ? "text-white/70" : "text-black/45"
                            }`}
                          >
                            {dayjs(issue.date).format("MM.DD")}
                          </div>
                          <div
                            className={`mt-1 text-sm font-semibold leading-snug ${
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
                          active ? "text-white/80" : "text-black/60"
                        }`}
                      >
                        {issue.summary || "Open this issue to read the full daily report."}
                      </div>
                    </Link>
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
