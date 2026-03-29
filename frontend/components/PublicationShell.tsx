import Link from "next/link";
import type { ReactNode } from "react";
import type { DailyIssue, WeeklyIssue } from "@/lib/content-loader";
import IssueRail from "@/components/IssueRail";
import {
  PROJECT_FLOW_LABEL,
  PROJECT_VALUE_LABEL,
  SITE_REPO_AVATAR,
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
  activeNav?: "home" | "about" | "podcast";
  children: ReactNode;
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
                <div className="header-brandline">
                  <span className="wordmark">{SITE_TITLE_EN}</span>
                  <span className="brand-caption-inline">{SITE_TITLE_ZH}</span>
                </div>
              </Link>
            </div>

            <div className="header-slogan">{SITE_SLOGAN}</div>

            <div className="header-actions">
              <nav className="header-nav">
                <Link
                  href="/"
                  className={`header-pill ${activeNav === "home" ? "header-pill-active" : ""}`}
                >
                  首页
                </Link>
                <Link
                  href="/about"
                  className={`header-pill ${activeNav === "about" ? "header-pill-active" : ""}`}
                >
                  项目说明
                </Link>
                {latestDate ? (
                  <Link href={`/${latestDate}`} className="header-pill">
                    最新日报
                  </Link>
                ) : null}
                <Link
                  href="/podcast"
                  className={`header-pill ${activeNav === "podcast" ? "header-pill-active" : ""}`}
                >
                  播客
                </Link>
              </nav>

              <a
                href={SITE_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="header-avatar-link"
                aria-label="GitHub source code"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="GitHub avatar" className="header-avatar" src={SITE_REPO_AVATAR} />
              </a>
            </div>
          </div>

          <div className="header-board">
            <div className="project-note">
              <div className="project-note-label">项目说明</div>
              <div className="project-note-flow">{PROJECT_FLOW_LABEL}</div>
              <p className="project-note-text">{PROJECT_VALUE_LABEL}</p>
            </div>

            <div className="header-metrics">
              <span className="header-stat">{dailyIssues.length} 份日报</span>
              <span className="header-stat">{weeklyIssues.length} 份周报</span>
              {latestDate ? <span className="header-stat">最新 {latestDate}</span> : null}
            </div>
          </div>
        </div>
      </header>

      <div className="publication-main page-frame flex gap-10 py-8">
        <aside className="archive-rail sticky top-44 hidden h-[calc(100vh-12rem)] w-[23rem] shrink-0 overflow-y-auto pr-2 md:block">
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
