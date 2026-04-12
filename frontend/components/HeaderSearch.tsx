"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SiteLocale } from "@/lib/locale";
import { withLocalePath } from "@/lib/locale";

export interface HeaderSearchDailyIssue {
  date: string;
  title: string;
  summary: string;
}

export interface HeaderSearchWeeklyIssue {
  weekId: string;
  label: string;
  rangeLabel: string;
  summary: string;
  latestDate: string;
}

type SearchResult =
  | {
      id: string;
      href: string;
      kind: string;
      kicker: string;
      title: string;
      summary: string;
    }
  | {
      id: string;
      href: string;
      kind: string;
      kicker: string;
      title: string;
      summary: string;
    };

interface HeaderSearchProps {
  locale: SiteLocale;
  dailyIssues: HeaderSearchDailyIssue[];
  weeklyIssues: HeaderSearchWeeklyIssue[];
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[\s./-]+/g, "");
}

function buildDailyResult(
  issue: HeaderSearchDailyIssue,
  locale: SiteLocale
): SearchResult {
  return {
    id: `daily-${issue.date}`,
    href: withLocalePath(locale, `/${issue.date}`),
    kind: locale === "en" ? "Daily" : "日报",
    kicker: issue.date.replace(/-/g, "."),
    title: issue.title,
    summary: issue.summary,
  };
}

function buildWeeklyResult(
  issue: HeaderSearchWeeklyIssue,
  locale: SiteLocale
): SearchResult {
  return {
    id: `weekly-${issue.weekId}`,
    href: withLocalePath(locale, `/weekly/${issue.weekId}`),
    kind: locale === "en" ? "Weekly" : "周报",
    kicker: issue.rangeLabel,
    title: issue.label,
    summary: issue.summary,
  };
}

function matchesQuery(query: string, segments: string[]): boolean {
  const normalizedQuery = normalizeSearchText(query);
  return segments.some((segment) =>
    normalizeSearchText(segment).includes(normalizedQuery)
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="header-search-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export default function HeaderSearch({
  locale,
  dailyIssues,
  weeklyIssues,
}: HeaderSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const trimmedQuery = query.trim();
  const isPreview = trimmedQuery.length === 0;
  const latestDaily = dailyIssues
    .slice(0, 2)
    .map((issue) => buildDailyResult(issue, locale));
  const latestWeekly = weeklyIssues
    .slice(0, 2)
    .map((issue) => buildWeeklyResult(issue, locale));
  const results =
    isPreview
      ? []
      : [
          ...dailyIssues
            .filter((issue) =>
              matchesQuery(trimmedQuery, [
                issue.date,
                issue.title,
                issue.summary,
                issue.date.replace(/-/g, ""),
              ])
            )
            .slice(0, 4)
            .map((issue) => buildDailyResult(issue, locale)),
          ...weeklyIssues
            .filter((issue) =>
              matchesQuery(trimmedQuery, [
                issue.weekId,
                issue.label,
                issue.rangeLabel,
                issue.summary,
                issue.latestDate,
              ])
            )
            .slice(0, 2)
            .map((issue) => buildWeeklyResult(issue, locale)),
        ].slice(0, 6);

  const showPanel =
    open &&
    (trimmedQuery.length > 0 || latestDaily.length > 0 || latestWeekly.length > 0);

  return (
    <div className="header-search-wrap">
      <label className={`header-search-shell ${open ? "is-focused" : ""}`}>
        <SearchIcon />
        <input
          ref={inputRef}
          type="search"
          className="header-search-input"
          value={query}
          placeholder={
            locale === "en"
              ? "Search dates, daily issues, or weekly digests"
              : "搜索日期、日报或周报"
          }
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
        />
        <span className="header-search-hint">Ctrl K</span>
      </label>

      {showPanel ? (
        <div className={`header-search-panel ${isPreview ? "is-preview" : ""}`}>
          {trimmedQuery.length > 0 ? (
            results.length > 0 ? (
              <div className="header-search-section">
                <div className="header-search-section-label">
                  {locale === "en" ? "Results" : "搜索结果"}
                </div>
                <div className="header-search-list">
                  {results.map((result) => (
                    <Link
                      key={result.id}
                      href={result.href}
                      className="header-search-item"
                    >
                      <div className="header-search-item-meta">
                        <span className="header-search-kind">{result.kind}</span>
                        <span>{result.kicker}</span>
                      </div>
                      <div className="header-search-item-title">{result.title}</div>
                      {!isPreview ? (
                        <div className="header-search-item-summary">{result.summary}</div>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="header-search-empty">
                {locale === "en"
                  ? "No matches yet. Try a date like `2026-03-29` or `20260329`."
                  : "没有匹配项。可以试试日期，例如 `2026-03-29` 或 `20260329`。"}
              </div>
            )
          ) : (
            <div className="header-search-grid">
              <div className="header-search-section">
                <div className="header-search-section-label">
                  {locale === "en" ? "Latest Daily" : "最新日报"}
                </div>
                <div className="header-search-list">
                  {latestDaily.map((result) => (
                    <Link
                      key={result.id}
                      href={result.href}
                      className="header-search-item"
                    >
                      <div className="header-search-item-meta">
                        <span className="header-search-kind">{result.kind}</span>
                        <span>{result.kicker}</span>
                      </div>
                      <div className="header-search-item-title">{result.title}</div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="header-search-section">
                <div className="header-search-section-label">
                  {locale === "en" ? "Latest Weekly" : "最新周报"}
                </div>
                <div className="header-search-list">
                  {latestWeekly.map((result) => (
                    <Link
                      key={result.id}
                      href={result.href}
                      className="header-search-item"
                    >
                      <div className="header-search-item-meta">
                        <span className="header-search-kind">{result.kind}</span>
                        <span>{result.kicker}</span>
                      </div>
                      <div className="header-search-item-title">{result.title}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
