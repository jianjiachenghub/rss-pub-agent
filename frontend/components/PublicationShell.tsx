import Link from "next/link";
import type { ReactNode } from "react";
import HeaderSearch from "@/components/HeaderSearch";
import IssueRail from "@/components/IssueRail";
import type { DailyIssue, WeeklyIssue } from "@/lib/content-loader";
import {
  SITE_REPO_URL,
  SITE_SLOGAN,
  SITE_TITLE_EN,
  SITE_TITLE_ZH,
} from "@/lib/site";

interface PublicationShellProps {
  dailyIssues: DailyIssue[];
  weeklyIssues: WeeklyIssue[];
  currentDate?: string;
  currentWeekId?: string;
  activeNav?: "home" | "daily" | "about" | "podcast";
  children: ReactNode;
}

function GitHubMark() {
  return (
    <svg
      aria-hidden="true"
      className="header-github-mark"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 1.25a10.75 10.75 0 0 0-3.4 20.95c.54.1.73-.23.73-.52v-2.03c-2.98.65-3.61-1.27-3.61-1.27-.49-1.24-1.2-1.57-1.2-1.57-.98-.67.07-.66.07-.66 1.08.08 1.65 1.1 1.65 1.1.96 1.64 2.52 1.17 3.13.89.1-.7.38-1.18.68-1.45-2.38-.27-4.88-1.19-4.88-5.28 0-1.16.42-2.11 1.1-2.85-.11-.27-.48-1.37.1-2.86 0 0 .9-.29 2.95 1.09a10.2 10.2 0 0 1 5.38 0c2.04-1.38 2.94-1.09 2.94-1.09.59 1.49.22 2.59.1 2.86.69.74 1.1 1.69 1.1 2.85 0 4.1-2.51 5-4.9 5.27.39.34.73 1 .73 2.03v3.01c0 .29.2.63.74.52A10.75 10.75 0 0 0 12 1.25Z" />
    </svg>
  );
}

function CatalogIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 4h11M2.5 8h7M2.5 12h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function PublicationShell({
  dailyIssues,
  weeklyIssues,
  currentDate,
  currentWeekId,
  activeNav = "home",
  children,
}: PublicationShellProps) {
  const latestDate = dailyIssues[0]?.date;
  const searchDailyIssues = dailyIssues.map((issue) => ({
    date: issue.date,
    title: issue.title,
    summary: issue.summary,
  }));
  const searchWeeklyIssues = weeklyIssues.map((issue) => ({
    weekId: issue.weekId,
    label: issue.label,
    rangeLabel: issue.rangeLabel,
    summary: issue.summary,
    latestDate: issue.latestDate,
  }));

  return (
    <div className="publication-shell min-h-screen text-stone-900">
      {/* ── Desktop header ── */}
      <header className="publication-header sticky top-0 z-40 desktop-header">
        <div className="page-frame py-4">
          <div className="header-topbar">
            <div className="header-brand-wrap">
              <Link href="/" className="header-brand-link min-w-0">
                <div className="header-brand-copy">
                  <div className="header-brandline">
                    <span className="wordmark">{SITE_TITLE_EN}</span>
                    {SITE_TITLE_ZH ? (
                      <span className="brand-caption-inline">{SITE_TITLE_ZH}</span>
                    ) : null}
                  </div>
                  <div className="header-brand-subline">{SITE_SLOGAN}</div>
                </div>
              </Link>
            </div>

            <div className="header-search-area">
              <HeaderSearch
                dailyIssues={searchDailyIssues}
                weeklyIssues={searchWeeklyIssues}
              />
            </div>

            <div className="header-actions">
              <nav className="header-nav">
                <Link
                  href="/"
                  className={`header-pill ${activeNav === "home" ? "header-pill-active" : ""}`}
                >
                  首页
                </Link>
                {latestDate ? (
                  <Link
                    href={`/${latestDate}`}
                    className={`header-pill ${activeNav === "daily" ? "header-pill-active" : ""}`}
                  >
                    最新日报
                  </Link>
                ) : null}
                <Link
                  href="/podcast"
                  className={`header-pill ${activeNav === "podcast" ? "header-pill-active" : ""}`}
                >
                  播客
                </Link>
                <Link
                  href="/about"
                  className={`header-pill ${activeNav === "about" ? "header-pill-active" : ""}`}
                >
                  项目说明
                </Link>
              </nav>

              <a
                href={SITE_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="header-github-link"
                aria-label="GitHub source code"
              >
                <GitHubMark />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile header ── */}
      <header className="mobile-header">
        <div className="mobile-header-inner">
          <nav className="mobile-header-nav">
            <Link href="/" className={`mobile-nav-link ${activeNav === "home" ? "is-active" : ""}`}>
              首页
            </Link>
            {latestDate ? (
              <Link href={`/${latestDate}`} className={`mobile-nav-link ${activeNav === "daily" ? "is-active" : ""}`}>
                日报
              </Link>
            ) : null}
            <Link href="/podcast" className={`mobile-nav-link ${activeNav === "podcast" ? "is-active" : ""}`}>
              播客
            </Link>
            <Link href="/about" className={`mobile-nav-link ${activeNav === "about" ? "is-active" : ""}`}>
              说明
            </Link>
            <a href={SITE_REPO_URL} target="_blank" rel="noopener noreferrer" className="mobile-nav-link">
              GitHub
            </a>
          </nav>

          <details className="mobile-catalog-menu">
            <summary className="mobile-catalog-toggle">
              <CatalogIcon />
            </summary>
            <div className="mobile-catalog-panel">
              <IssueRail
                compact
                currentDate={currentDate}
                currentWeekId={currentWeekId}
                dailyIssues={dailyIssues}
                weeklyIssues={weeklyIssues}
              />
            </div>
          </details>
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
