"use client";

import dayjs from "dayjs";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import type { DailyIssue, TimelineDay, WeeklyIssue } from "@/lib/content-loader";
import ResilientImage from "@/components/ResilientImage";

type HomeTab = "weekly" | "timeline";

interface HomeTabsProps {
  dailyIssues: DailyIssue[];
  weeklyIssues: WeeklyIssue[];
  timelineDays: TimelineDay[];
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tab-button ${active ? "tab-button-active" : ""}`}
    >
      {children}
    </button>
  );
}

function buildWeeklyNote(issue: WeeklyIssue): string {
  const themes = issue.categories.slice(0, 3).join(" / ");
  const issueLabel = `${issue.issueCount} 份日报`;
  const storyLabel = `${issue.itemCount} 条资讯`;

  if (!themes) {
    return `这份周报基于现有归档日报整理而成，覆盖了 ${issueLabel} 和 ${storyLabel}。`;
  }

  return `这份周报整理了 ${issueLabel} 和 ${storyLabel}。本周反复出现的主题包括 ${themes}，下方可以继续跳回每一天的原始内容。`;
}

function WeeklyPanel({ weeklyIssues }: { weeklyIssues: WeeklyIssue[] }) {
  const leadIssue = weeklyIssues[0];
  const archiveIssues = weeklyIssues.slice(1);

  if (!leadIssue) {
    return (
      <section className="editorial-card px-6 py-10">
        <div className="section-label">暂无周报</div>
        <p className="mt-6 text-base leading-8 text-black/72">
          有足够多的日更内容后，这里会自动整理成按月分周的周报。
        </p>
      </section>
    );
  }

  return (
    <div className="panel-enter space-y-8">
      {/* Lead weekly — full detail inline */}
      <section className="editorial-card hero-card p-6 md:p-8">
        <div className="section-label">本周周报</div>
        <div className="mt-8 space-y-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-black/60">
            {leadIssue.rangeLabel}
          </div>
          <h1 className="display-title display-title-compact max-w-4xl">
            {leadIssue.label}
          </h1>
          <p className="max-w-4xl text-lg leading-9 text-black/78">
            {leadIssue.summary || buildWeeklyNote(leadIssue)}
          </p>
          <div className="flex flex-wrap gap-3">
            {leadIssue.categories.map((category) => (
              <span key={category} className="outline-chip">
                {category}
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

      {/* Metrics */}
      <section className="grid gap-4 md:grid-cols-4">
        <div className="metric-card">
          <div className="metric-value">{leadIssue.issueCount}</div>
          <div className="metric-label">日更数</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{leadIssue.itemCount}</div>
          <div className="metric-label">资讯数</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{leadIssue.avgScore}</div>
          <div className="metric-label">均分</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{leadIssue.keyTitles.length}</div>
          <div className="metric-label">重点数</div>
        </div>
      </section>

      {/* Key points + archive note */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="editorial-card p-6 md:p-8">
          <div className="section-label">本周重点</div>
          <div className="mt-7 space-y-4">
            {leadIssue.keyTitles.map((title, index) => (
              <div key={`${title}-${index}`} className="border-t border-black/10 pt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/46">
                  重点 {String(index + 1).padStart(2, "0")}
                </div>
                <div className="mt-2 text-lg font-semibold leading-snug text-black">
                  {title}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="editorial-card p-6 md:p-8">
          <div className="section-label">归档说明</div>
          <p className="mt-7 text-sm leading-8 text-black/74">{buildWeeklyNote(leadIssue)}</p>
        </div>
      </section>

      {/* Daily entries within the week */}
      <section className="editorial-card p-6 md:p-8">
        <div className="section-label">每日内容</div>
        <div className="mt-8 space-y-5">
          {leadIssue.days.map((day) => (
            <Link
              key={day.date}
              href={`/${day.date}`}
              className="weekly-day-entry grid gap-5 border-t border-black/10 pt-5 md:grid-cols-[9rem_minmax(0,1fr)]"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-black/58">
                <div>{dayjs(day.date).format("YYYY.MM.DD")}</div>
                <div className="mt-2">{day.meta?.itemCount ?? 0} 条资讯</div>
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

      {/* Older weeks archive */}
      {archiveIssues.length > 0 && (
        <section>
          <div className="section-label mb-5">往期周报</div>
          <div className="grid gap-5 lg:grid-cols-2">
            {archiveIssues.map((issue) => (
              <Link
                key={issue.weekId}
                href={`/weekly/${issue.weekId}`}
                className="editorial-card interactive-panel surface-link story-card block px-6 py-6"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/58">
                  {issue.rangeLabel}
                </div>
                <div className="mt-3 text-2xl font-semibold text-black">
                  <span className="hover-underline">{issue.label}</span>
                </div>
                <p className="mt-4 line-clamp-3 text-sm leading-7 text-black/72">
                  {issue.summary || "打开查看这一周整理后的周报内容。"}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {issue.categories.map((category) => (
                    <span key={category} className="outline-chip">
                      {category}
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

function TimelinePanel({ timelineDays }: { timelineDays: TimelineDay[] }) {
  return (
    <section className="panel-enter editorial-card p-6 md:p-8">
      <div className="section-label">按天时间线</div>
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
                href={`/${day.date}`}
                className="timeline-anchor mt-2 block text-2xl font-semibold leading-tight text-black"
              >
                <span className="hover-underline">{day.title}</span>
              </Link>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-black/74">
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
  weeklyIssues,
  timelineDays,
}: HomeTabsProps) {
  const [activeTab, setActiveTab] = useState<HomeTab>("weekly");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <TabButton active={activeTab === "weekly"} onClick={() => setActiveTab("weekly")}>
          周报
        </TabButton>
        <TabButton active={activeTab === "timeline"} onClick={() => setActiveTab("timeline")}>
          时间线
        </TabButton>
      </div>

      {activeTab === "weekly" ? <WeeklyPanel weeklyIssues={weeklyIssues} /> : null}
      {activeTab === "timeline" ? <TimelinePanel timelineDays={timelineDays} /> : null}
    </div>
  );
}
