"use client";

import dayjs from "dayjs";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import type { DailyIssue, TimelineDay, WeeklyIssue } from "@/lib/content-loader";
import ResilientImage from "@/components/ResilientImage";
import { getCategoryDisplayLabel } from "@/lib/display-text";
import type { SiteLocale } from "@/lib/locale";
import { withLocalePath } from "@/lib/locale";

type HomeTab = "weekly" | "timeline";

interface HomeTabsProps {
  locale: SiteLocale;
  dailyIssues: DailyIssue[];
  weeklyIssues: WeeklyIssue[];
  timelineDays: TimelineDay[];
}

function getHomeCopy(locale: SiteLocale) {
  if (locale === "en") {
    return {
      weeklyTab: "Weekly",
      timelineTab: "Timeline",
      noWeekly: "No weekly digest yet",
      noWeeklyBody:
        "Once the archive has enough daily issues, this panel will group them into monthly weekly digests automatically.",
      leadWeekly: "This Week",
      dailyCount: "Daily issues",
      storyCount: "Stories",
      avgScore: "Avg score",
      highlightCount: "Highlights",
      weeklyHighlights: "Highlights",
      archiveNote: "Archive note",
      dayContent: "Daily issues",
      olderWeekly: "Earlier weekly digests",
      openWeekly: "Open this week's digest.",
      timeline: "Timeline",
      focusLabel: "Highlight",
      itemSuffix: "stories",
    };
  }

  return {
    weeklyTab: "周报",
    timelineTab: "时间线",
    noWeekly: "暂无周报",
    noWeeklyBody: "有足够多的日更内容后，这里会自动整理成按月分周的周报。",
    leadWeekly: "本周周报",
    dailyCount: "日更数",
    storyCount: "资讯数",
    avgScore: "均分",
    highlightCount: "重点数",
    weeklyHighlights: "本周重点",
    archiveNote: "归档说明",
    dayContent: "每日内容",
    olderWeekly: "往期周报",
    openWeekly: "打开查看这一周整理后的周报内容。",
    timeline: "按天时间线",
    focusLabel: "重点",
    itemSuffix: "条资讯",
  };
}

function TabButton({
  active,
  onClick,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tab-button ${active ? "tab-button-active" : ""} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function buildWeeklyNote(issue: WeeklyIssue, locale: SiteLocale): string {
  const themes = issue.categories
    .slice(0, 3)
    .map((category) => getCategoryDisplayLabel(category, locale))
    .join(" / ");

  if (locale === "en") {
    const issueLabel = `${issue.issueCount} daily issues`;
    const storyLabel = `${issue.itemCount} stories`;

    if (!themes) {
      return `This weekly digest is compiled from the existing daily archive and covers ${issueLabel} and ${storyLabel}.`;
    }

    return `This weekly digest rolls up ${issueLabel} and ${storyLabel}. Repeating themes this week include ${themes}, and you can jump back into each individual day below.`;
  }

  const issueLabel = `${issue.issueCount} 份日报`;
  const storyLabel = `${issue.itemCount} 条资讯`;

  if (!themes) {
    return `这份周报基于现有归档日报整理而成，覆盖了 ${issueLabel} 和 ${storyLabel}。`;
  }

  return `这份周报整理了 ${issueLabel} 和 ${storyLabel}。本周反复出现的主题包括 ${themes}，下方可以继续跳回每一天的原始内容。`;
}

function WeeklyPanel({
  locale,
  weeklyIssues,
}: {
  locale: SiteLocale;
  weeklyIssues: WeeklyIssue[];
}) {
  const copy = getHomeCopy(locale);
  const leadIssue = weeklyIssues[0];
  const archiveIssues = weeklyIssues.slice(1);

  if (!leadIssue) {
    return (
      <section className="editorial-card px-6 py-10">
        <div className="section-label">{copy.noWeekly}</div>
        <p className="mt-6 text-base leading-8 text-black/72">{copy.noWeeklyBody}</p>
      </section>
    );
  }

  return (
    <div className="panel-enter space-y-8">
      <section className="editorial-card hero-card p-6 md:p-8">
        <div className="section-label">{copy.leadWeekly}</div>
        <div className="mt-8 space-y-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-black/60">
            {leadIssue.rangeLabel}
          </div>
          <h1 className="display-title display-title-compact max-w-4xl">
            {leadIssue.label}
          </h1>
          <p className="max-w-4xl text-lg leading-9 text-black/78">
            {leadIssue.summary || buildWeeklyNote(leadIssue, locale)}
          </p>
          <div className="flex flex-wrap gap-3">
            {leadIssue.categories.map((category) => (
              <span key={category} className="outline-chip">
                {getCategoryDisplayLabel(category, locale)}
              </span>
            ))}
          </div>
          <ResilientImage
            alt={leadIssue.label}
            className="hero-media h-[24rem] w-full object-cover"
            fallback="hide"
            src={leadIssue.heroImageUrl}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="metric-card">
          <div className="metric-value">{leadIssue.issueCount}</div>
          <div className="metric-label">{copy.dailyCount}</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{leadIssue.itemCount}</div>
          <div className="metric-label">{copy.storyCount}</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{leadIssue.avgScore}</div>
          <div className="metric-label">{copy.avgScore}</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{leadIssue.keyTitles.length}</div>
          <div className="metric-label">{copy.highlightCount}</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="editorial-card p-6 md:p-8">
          <div className="section-label">{copy.weeklyHighlights}</div>
          <div className="mt-7 space-y-4">
            {leadIssue.keyTitles.map((title, index) => (
              <div key={`${title}-${index}`} className="border-t border-black/10 pt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/46">
                  {copy.focusLabel} {String(index + 1).padStart(2, "0")}
                </div>
                <div className="mt-2 text-lg font-semibold leading-snug text-black">
                  {title}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="editorial-card p-6 md:p-8">
          <div className="section-label">{copy.archiveNote}</div>
          <p className="mt-7 text-sm leading-8 text-black/74">
            {buildWeeklyNote(leadIssue, locale)}
          </p>
        </div>
      </section>

      <section className="editorial-card p-6 md:p-8">
        <div className="section-label">{copy.dayContent}</div>
        <div className="mt-8 space-y-5">
          {leadIssue.days.map((day) => (
            <Link
              key={day.date}
              href={withLocalePath(locale, `/${day.date}`)}
              className="weekly-day-entry grid gap-5 border-t border-black/10 pt-5 md:grid-cols-[9rem_minmax(0,1fr)]"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-black/58">
                <div>{dayjs(day.date).format("YYYY.MM.DD")}</div>
                <div className="mt-2">
                  {day.meta?.itemCount ?? 0} {copy.itemSuffix}
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-semibold leading-tight text-black">
                  <span className="hover-underline">{day.title}</span>
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-black/74">{day.summary}</p>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {day.keyTitles.slice(0, 4).map((title, index) => (
                    <div
                      key={`${day.date}-${index}`}
                      className="border-t border-black/10 pt-3 text-sm leading-6 text-black/76"
                    >
                      {title}
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {archiveIssues.length > 0 && (
        <section>
          <div className="section-label mb-5">{copy.olderWeekly}</div>
          <div className="grid gap-5 lg:grid-cols-2">
            {archiveIssues.map((issue) => (
              <Link
                key={issue.weekId}
                href={withLocalePath(locale, `/weekly/${issue.weekId}`)}
                className="editorial-card interactive-panel surface-link story-card block px-6 py-6"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/58">
                  {issue.rangeLabel}
                </div>
                <div className="mt-3 text-2xl font-semibold text-black">
                  <span className="hover-underline">{issue.label}</span>
                </div>
                <p className="mt-4 line-clamp-3 text-sm leading-7 text-black/72">
                  {issue.summary || copy.openWeekly}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {issue.categories.map((category) => (
                    <span key={category} className="outline-chip">
                      {getCategoryDisplayLabel(category, locale)}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TimelinePanel({
  locale,
  timelineDays,
}: {
  locale: SiteLocale;
  timelineDays: TimelineDay[];
}) {
  const copy = getHomeCopy(locale);

  return (
    <section className="panel-enter editorial-card p-6 md:p-8">
      <div className="section-label">{copy.timeline}</div>
      <div className="mt-8 space-y-7">
        {timelineDays.map((day, index) => (
          <div key={day.date} className="timeline-row">
            <div className="timeline-axis">
              <span className="timeline-dot" />
              {index < timelineDays.length - 1 ? <span className="timeline-line" /> : null}
            </div>
            <div className="flex-1 pb-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/56">
                {dayjs(day.date).format("YYYY.MM.DD")}
              </div>
              <Link
                href={withLocalePath(locale, `/${day.date}`)}
                className="timeline-anchor mt-2 block text-2xl font-semibold leading-tight text-black"
              >
                <span className="hover-underline">{day.title}</span>
              </Link>
              <p className="mt-3 max-w-3xl text-base leading-8 text-black">
                {day.summary}
              </p>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {day.keyTitles.map((title, itemIndex) => (
                  <div
                    key={`${day.date}-${itemIndex}`}
                    className="border-t border-black/10 pt-3 text-sm leading-6 text-black/76"
                  >
                    {title}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomeTabs({
  locale,
  weeklyIssues,
  timelineDays,
}: HomeTabsProps) {
  const copy = getHomeCopy(locale);
  const [activeTab, setActiveTab] = useState<HomeTab>(
    timelineDays.length > 0 ? "timeline" : "weekly"
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <TabButton
          active={activeTab === "weekly"}
          onClick={() => setActiveTab("weekly")}
          className="order-2"
        >
          {copy.weeklyTab}
        </TabButton>
        <TabButton
          active={activeTab === "timeline"}
          onClick={() => setActiveTab("timeline")}
          className="order-1"
        >
          {copy.timelineTab}
        </TabButton>
      </div>

      {activeTab === "weekly" ? (
        <WeeklyPanel locale={locale} weeklyIssues={weeklyIssues} />
      ) : null}
      {activeTab === "timeline" ? (
        <TimelinePanel locale={locale} timelineDays={timelineDays} />
      ) : null}
    </div>
  );
}
