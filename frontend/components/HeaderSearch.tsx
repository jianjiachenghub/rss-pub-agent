"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
      kind: "日报";
      kicker: string;
      title: string;
      summary: string;
    }
  | {
      id: string;
      href: string;
      kind: "周报";
      kicker: string;
      title: string;
      summary: string;
    };

interface HeaderSearchProps {
  dailyIssues: HeaderSearchDailyIssue[];
  weeklyIssues: HeaderSearchWeeklyIssue[];
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[\s./-]+/g, "");
}

function buildDailyResult(issue: HeaderSearchDailyIssue): SearchResult {
  return {
    id: `daily-${issue.date}`,
    href: `/${issue.date}`,
    kind: "日报",
    kicker: issue.date.replace(/-/g, "."),
    title: issue.title,
    summary: issue.summary,
  };
}

function buildWeeklyResult(issue: HeaderSearchWeeklyIssue): SearchResult {
  return {
    id: `weekly-${issue.weekId}`,
    href: `/weekly/${issue.weekId}`,
    kind: "周报",
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
  const latestDaily = dailyIssues.slice(0, 2).map(buildDailyResult);
  const latestWeekly = weeklyIssues.slice(0, 2).map(buildWeeklyResult);
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
            .map(buildDailyResult),
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
            .map(buildWeeklyResult),
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
          placeholder="搜索日期、日报或周报"
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
                <div className="header-search-section-label">搜索结果</div>
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
                没有匹配项。可以试试日期，例如 `2026-03-29` 或 `20260329`。
              </div>
            )
          ) : (
            <div className="header-search-grid">
              <div className="header-search-section">
                <div className="header-search-section-label">最新日报</div>
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
                <div className="header-search-section-label">最新周报</div>
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
