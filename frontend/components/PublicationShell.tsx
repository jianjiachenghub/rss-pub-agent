import Link from "next/link";
import type { ReactNode } from "react";
import type { DailyIssue, WeeklyIssue } from "@/lib/content-loader";
import IssueRail from "@/components/IssueRail";

export interface PublicationHeader {
  section: string;
  title: string;
  meta?: string[];
}

interface PublicationShellProps {
  dailyIssues: DailyIssue[];
  weeklyIssues: WeeklyIssue[];
  currentDate?: string;
  currentWeekId?: string;
  header: PublicationHeader;
  activeNav?: "archive" | "podcast";
  children: ReactNode;
}

export default function PublicationShell({
  dailyIssues,
  weeklyIssues,
  currentDate,
  currentWeekId,
  header,
  activeNav = "archive",
  children,
}: PublicationShellProps) {
  const latestDate = dailyIssues[0]?.date;
  const metaItems = (header.meta ?? []).filter(
    (item): item is string => Boolean(item)
  );

  return (
    <div className="publication-shell min-h-screen text-stone-900">
      <header className="publication-header sticky top-0 z-40">
        <div className="page-frame py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <details className="relative md:hidden">
                <summary className="mobile-menu-toggle flex h-9 w-14 cursor-pointer items-center justify-center list-none">
                  菜单
                </summary>
                <div className="absolute left-0 top-12 z-50 w-[min(86vw,24rem)] rounded-[28px] border border-white/75 bg-[rgba(246,249,255,0.88)] p-4 shadow-[0_22px_44px_rgba(18,24,38,0.12)] backdrop-blur-2xl">
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
                <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-black/45">
                  新闻日报系统
                </div>
              </Link>
            </div>

            <nav className="flex items-center justify-end gap-2 md:order-3">
              <Link
                href="/"
                className={`header-pill ${activeNav === "archive" ? "header-pill-active" : ""}`}
              >
                Archive
              </Link>
              {latestDate ? (
                <Link href={`/${latestDate}`} className="header-pill">
                  Latest
                </Link>
              ) : null}
              <Link
                href="/podcast"
                className={`header-pill ${activeNav === "podcast" ? "header-pill-active" : ""}`}
              >
                Podcast
              </Link>
            </nav>

            <div className="context-panel col-span-full min-w-0 md:col-span-1 md:order-2">
              <div className="context-kicker">{header.section}</div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <div className="context-title">{header.title}</div>
                {metaItems.map((item) => (
                  <span key={item} className="context-meta">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="publication-main page-frame flex gap-10 py-8">
        <aside className="archive-rail sticky top-28 hidden h-[calc(100vh-8rem)] w-[22rem] shrink-0 overflow-y-auto pr-2 md:block">
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
