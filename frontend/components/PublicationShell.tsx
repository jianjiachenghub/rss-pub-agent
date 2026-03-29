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
        <div className="page-frame py-4">
          <div className="header-topbar">
            <div className="header-brand-wrap">
              <details className="relative md:hidden">
                <summary className="mobile-menu-toggle flex h-10 min-w-16 cursor-pointer items-center justify-center list-none">
                  目录
                </summary>
                <div className="header-mobile-panel">
                  <IssueRail
                    compact
                    currentDate={currentDate}
                    currentWeekId={currentWeekId}
                    dailyIssues={dailyIssues}
                    weeklyIssues={weeklyIssues}
                  />
                </div>
              </details>

              <Link href="/" className="header-brand-link min-w-0">
                <div className="wordmark">AI NEWS FLOW</div>
                <div className="brand-caption">新闻日报系统</div>
              </Link>
            </div>

            <nav className="header-nav">
              <Link
                href="/"
                className={`header-pill ${activeNav === "archive" ? "header-pill-active" : ""}`}
              >
                首页
              </Link>
              {latestDate ? (
                <Link href={`/${latestDate}`} className="header-pill">
                  最新
                </Link>
              ) : null}
              <Link
                href="/podcast"
                className={`header-pill ${activeNav === "podcast" ? "header-pill-active" : ""}`}
              >
                播客
              </Link>
            </nav>
          </div>

          <div className="header-board">
            <div className="header-copy">
              <div className="header-section">{header.section}</div>
              <div className="header-title">{header.title}</div>
            </div>

            {metaItems.length > 0 ? (
              <div className="header-metrics">
                {metaItems.map((item) => (
                  <span key={item} className="header-stat">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="publication-main page-frame flex gap-10 py-8">
        <aside className="archive-rail sticky top-36 hidden h-[calc(100vh-10rem)] w-[23rem] shrink-0 overflow-y-auto pr-2 md:block">
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
