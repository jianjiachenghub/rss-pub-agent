import Link from "next/link";
import type { ReactNode } from "react";
import type { DailyIssue, WeeklyIssue } from "@/lib/content-loader";
import IssueRail from "@/components/IssueRail";

interface PublicationShellProps {
  dailyIssues: DailyIssue[];
  weeklyIssues: WeeklyIssue[];
  currentDate?: string;
  currentWeekId?: string;
  masthead: ReactNode;
  children: ReactNode;
}

export default function PublicationShell({
  dailyIssues,
  weeklyIssues,
  currentDate,
  currentWeekId,
  masthead,
  children,
}: PublicationShellProps) {
  const latestDate = dailyIssues[0]?.date;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(244,244,243,0.98)_40%,_rgba(236,234,230,0.94)_100%)] text-stone-900">
      <header className="sticky top-0 z-40 border-b border-black/15 bg-[#f5f2eb]/95 backdrop-blur">
        <div className="page-frame flex min-h-18 items-center justify-between gap-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <details className="relative md:hidden">
              <summary className="flex h-10 w-10 cursor-pointer items-center justify-center border border-black text-lg list-none">
                ≡
              </summary>
              <div className="absolute left-0 top-12 z-50 w-[min(86vw,24rem)] border border-black bg-[#fbfaf7] p-4 shadow-[10px_10px_0_rgba(0,0,0,0.08)]">
                <IssueRail
                  compact
                  currentDate={currentDate}
                  currentWeekId={currentWeekId}
                  dailyIssues={dailyIssues}
                  weeklyIssues={weeklyIssues}
                />
              </div>
            </details>
            <Link href="/" className="min-w-0">
              <div className="wordmark">AI NEWS FLOW</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-black/45">
                Editorial Archive
              </div>
            </Link>
          </div>

          <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">
            {masthead}
          </div>

          <div className="hidden items-center gap-5 text-[11px] font-semibold uppercase tracking-[0.22em] md:flex">
            {latestDate ? (
              <Link href={`/${latestDate}`} className="header-link">
                Latest
              </Link>
            ) : null}
            <Link href="/" className="header-link">
              Archive
            </Link>
            <Link href="/podcast" className="header-link">
              Podcast
            </Link>
          </div>
        </div>
        <div className="page-frame pb-4 md:hidden">{masthead}</div>
      </header>

      <div className="page-frame flex gap-10 py-8">
        <aside className="sticky top-28 hidden h-[calc(100vh-8rem)] w-[22rem] shrink-0 overflow-y-auto pr-2 md:block">
          <IssueRail
            currentDate={currentDate}
            currentWeekId={currentWeekId}
            dailyIssues={dailyIssues}
            weeklyIssues={weeklyIssues}
          />
        </aside>
        <main className="min-w-0 flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}
