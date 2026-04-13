import Link from "next/link";
import type { ReactNode } from "react";
import HeaderSearch from "@/components/HeaderSearch";
import IssueRail from "@/components/IssueRail";
import type { DailyIssue, WeeklyIssue } from "@/lib/content-loader";
import {
  getAlternateLocale,
  withLocalePath,
} from "@/lib/locale";
import type { SiteLocale } from "@/lib/locale";
import {
  SITE_REPO_URL,
  SITE_SLOGAN_EN,
  SITE_SLOGAN_ZH,
  SITE_SLOGAN,
  SITE_TITLE_EN,
  SITE_TITLE_ZH,
} from "@/lib/site";

interface PublicationShellProps {
  locale: SiteLocale;
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
  locale,
  dailyIssues,
  weeklyIssues,
  currentDate,
  currentWeekId,
  activeNav = "home",
  children,
}: PublicationShellProps) {
  const latestDate = dailyIssues[0]?.date;
  const alternateLocale = getAlternateLocale(locale);
  const languageMenuCopy =
    locale === "en"
      ? {
          current: "English",
          action: "Change language",
        }
      : {
          current: "简体中文",
          action: "切换语言",
        };
  const languageOptions: Array<{ locale: SiteLocale; label: string }> = [
    { locale: "en", label: "English" },
    { locale: "zh", label: "简体中文" },
  ];
  const navCopy =
    locale === "en"
      ? {
          home: "Home",
          latestDaily: "Latest Daily",
          daily: "Daily",
          podcast: "Podcast",
          about: "About",
          archive: "Archive",
          github: "GitHub source code",
        }
      : {
          home: "首页",
          latestDaily: "最新日报",
          daily: "日报",
          podcast: "播客",
          about: "项目说明",
          archive: "归档",
          github: "GitHub source code",
        };
  const siteSlogan = locale === "en" ? SITE_SLOGAN_EN : SITE_SLOGAN_ZH || SITE_SLOGAN;

  const currentBasePath =
    activeNav === "daily" && (currentDate || latestDate)
      ? `/${currentDate ?? latestDate}`
      : currentWeekId
        ? `/weekly/${currentWeekId}`
        : activeNav === "podcast"
          ? "/podcast"
          : activeNav === "about"
            ? "/about"
            : "/";

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
              <Link href={withLocalePath(locale, "/")} className="header-brand-link min-w-0">
                <div className="header-brand-copy">
                  <div className="header-brandline">
                    <span className="wordmark">{SITE_TITLE_EN}</span>
                    {SITE_TITLE_ZH ? (
                      <span className="brand-caption-inline">{SITE_TITLE_ZH}</span>
                    ) : null}
                  </div>
                  <div className="header-brand-subline">{siteSlogan}</div>
                </div>
              </Link>
            </div>

            <div className="header-search-area">
              <HeaderSearch
                locale={locale}
                dailyIssues={searchDailyIssues}
                weeklyIssues={searchWeeklyIssues}
              />
            </div>

            <div className="header-actions">
              <nav className="header-nav">
                <Link
                  href={withLocalePath(locale, "/")}
                  className={`header-pill ${activeNav === "home" ? "header-pill-active" : ""}`}
                >
                  {navCopy.home}
                </Link>
                {latestDate ? (
                  <Link
                    href={withLocalePath(locale, `/${latestDate}`)}
                    className={`header-pill ${activeNav === "daily" ? "header-pill-active" : ""}`}
                  >
                    {navCopy.latestDaily}
                  </Link>
                ) : null}
                <Link
                  href={withLocalePath(locale, "/podcast")}
                  className={`header-pill ${activeNav === "podcast" ? "header-pill-active" : ""}`}
                >
                  {navCopy.podcast}
                </Link>
                <Link
                  href={withLocalePath(locale, "/about")}
                  className={`header-pill ${activeNav === "about" ? "header-pill-active" : ""}`}
                >
                  {navCopy.about}
                </Link>
              </nav>

              <details className="header-language-menu">
                <summary className="header-language-trigger" aria-label={languageMenuCopy.action}>
                  <span className="header-language-trigger-label">{languageMenuCopy.current}</span>
                  <span className="header-language-caret" aria-hidden="true">
                    ▾
                  </span>
                </summary>
                <div className="header-language-panel" role="menu">
                  {languageOptions.map((option) =>
                    option.locale === locale ? (
                      <span
                        key={option.locale}
                        className="header-language-option is-active"
                        role="menuitem"
                      >
                        {option.label}
                      </span>
                    ) : (
                      <Link
                        key={option.locale}
                        href={withLocalePath(option.locale, currentBasePath)}
                        className="header-language-option"
                        role="menuitem"
                      >
                        {option.label}
                      </Link>
                    )
                  )}
                </div>
              </details>

              <a
                href={SITE_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="header-github-link"
                aria-label={navCopy.github}
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
            <Link
              href={withLocalePath(locale, "/")}
              className={`mobile-nav-link ${activeNav === "home" ? "is-active" : ""}`}
            >
              {navCopy.home}
            </Link>
            {latestDate ? (
              <Link
                href={withLocalePath(locale, `/${latestDate}`)}
                className={`mobile-nav-link ${activeNav === "daily" ? "is-active" : ""}`}
              >
                {navCopy.daily}
              </Link>
            ) : null}
            <Link
              href={withLocalePath(locale, "/podcast")}
              className={`mobile-nav-link ${activeNav === "podcast" ? "is-active" : ""}`}
            >
              {navCopy.podcast}
            </Link>
            <Link
              href={withLocalePath(locale, "/about")}
              className={`mobile-nav-link ${activeNav === "about" ? "is-active" : ""}`}
            >
              {locale === "en" ? "About" : "说明"}
            </Link>
            <Link
              href={withLocalePath(alternateLocale, currentBasePath)}
              className="mobile-nav-link"
            >
              {alternateLocale === "en" ? "English" : "简体中文"}
            </Link>
            <a
              href={SITE_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mobile-nav-link"
            >
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
                locale={locale}
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
            locale={locale}
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
