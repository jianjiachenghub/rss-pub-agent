"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import dayjs from "dayjs";
import type { DailyIssue, TimelineDay, WeeklyIssue } from "@/lib/content-loader";

type HomeTab = "daily" | "weekly" | "timeline";

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
      className={`border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.28em] transition-colors ${
        active
          ? "border-black bg-black text-white"
          : "border-black/15 bg-white text-black/60 hover:border-black hover:text-black"
      }`}
    >
      {children}
    </button>
  );
}

function MetaLine({ issue }: { issue: DailyIssue }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.22em] text-black/45">
      <span>{dayjs(issue.date).format("YYYY.MM.DD")}</span>
      {issue.meta ? <span>{issue.meta.itemCount} items</span> : null}
      {issue.meta ? <span>avg {issue.meta.avgScore}</span> : null}
      {issue.heroImageUrl ? <span>image</span> : null}
      {issue.meta?.hasPodcast ? <span>podcast</span> : null}
    </div>
  );
}

function DailyPanel({ dailyIssues }: { dailyIssues: DailyIssue[] }) {
  const leadIssue = dailyIssues[0];
  const recentIssues = dailyIssues.slice(1, 5);

  if (!leadIssue) {
    return (
      <section className="editorial-card px-6 py-10">
        <div className="section-label">No Issue</div>
        <p className="mt-6 text-sm text-black/60">
          Run the pipeline first to populate the archive.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-10">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.85fr)]">
        <article className="editorial-card p-6 md:p-8">
          <div className="section-label">Daily Lead</div>
          <div className="mt-8 space-y-6">
            <MetaLine issue={leadIssue} />
            <div className="space-y-4">
              <h1 className="display-title max-w-4xl">{leadIssue.title}</h1>
              <p className="max-w-3xl text-lg leading-9 text-black/72">
                {leadIssue.summary || "Open the latest issue to read the full editorial report."}
              </p>
            </div>
            {leadIssue.heroImageUrl ? (
              <img
                alt={leadIssue.title}
                className="h-[22rem] w-full border border-black/10 object-cover"
                src={leadIssue.heroImageUrl}
              />
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/${leadIssue.date}`} className="action-chip">
                Read Full Issue
              </Link>
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-black/45">
                {leadIssue.keyTitles.length} key story anchors
              </span>
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="section-label">Recent Issues</div>
          {recentIssues.map((issue) => (
            <Link
              key={issue.date}
              href={`/${issue.date}`}
              className="editorial-card block px-5 py-5 transition-transform hover:-translate-y-0.5"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/45">
                {dayjs(issue.date).format("YYYY.MM.DD")}
              </div>
              <h2 className="mt-3 text-xl font-semibold leading-tight text-black">
                {issue.title}
              </h2>
              <p className="mt-3 line-clamp-3 text-sm leading-7 text-black/62">
                {issue.summary || "Browse the report highlights for this issue."}
              </p>
            </Link>
          ))}
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <article className="editorial-card p-6 md:p-8">
          <div className="section-label">Key Stories</div>
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            {leadIssue.keyTitles.map((title, index) => (
              <div key={`${title}-${index}`} className="border-t border-black/12 pt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/35">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="mt-2 text-xl font-semibold leading-snug text-black">
                  {title}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="editorial-card p-6 md:p-8">
          <div className="section-label">Watch Signals</div>
          <div className="mt-7 space-y-4">
            {(leadIssue.watchSignals.length > 0
              ? leadIssue.watchSignals
              : [
                  "Open the latest issue to see the closing watchlist.",
                  "Use the timeline tab to compare day-level shifts.",
                ]
            ).map((signal, index) => (
              <div key={`${signal}-${index}`} className="border-t border-black/12 pt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/35">
                  Signal {String(index + 1).padStart(2, "0")}
                </div>
                <div className="mt-2 text-base leading-7 text-black/68">{signal}</div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function WeeklyPanel({ weeklyIssues }: { weeklyIssues: WeeklyIssue[] }) {
  const leadIssue = weeklyIssues[0];
  const archiveIssues = weeklyIssues.slice(1);

  if (!leadIssue) {
    return (
      <section className="editorial-card px-6 py-10">
        <div className="section-label">No Weekly View</div>
        <p className="mt-6 text-sm text-black/60">
          Weekly briefs appear automatically once there are daily issues to group.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <article className="editorial-card grid gap-8 p-6 md:p-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
        <div>
          <div className="section-label">Weekly Brief</div>
          <div className="mt-8 font-mono text-[11px] uppercase tracking-[0.24em] text-black/45">
            {leadIssue.rangeLabel}
          </div>
          <h1 className="display-title mt-4 max-w-4xl">{leadIssue.label}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-9 text-black/72">
            {leadIssue.summary ||
              "This week view is composed from the issue archive without altering source content."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/weekly/${leadIssue.weekId}`} className="action-chip">
              Open Weekly Brief
            </Link>
            {leadIssue.categories.map((category) => (
              <span key={category} className="outline-chip">
                {category}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4 border-l border-black/10 pl-0 xl:pl-6">
          <div className="section-label">Week Meta</div>
          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="metric-card">
              <div className="metric-value">{leadIssue.issueCount}</div>
              <div className="metric-label">Issues</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{leadIssue.itemCount}</div>
              <div className="metric-label">Stories</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{leadIssue.avgScore}</div>
              <div className="metric-label">Avg Score</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{leadIssue.keyTitles.length}</div>
              <div className="metric-label">Anchors</div>
            </div>
          </div>
        </div>
      </article>

      <section className="grid gap-5 lg:grid-cols-2">
        {archiveIssues.map((issue) => (
          <Link
            key={issue.weekId}
            href={`/weekly/${issue.weekId}`}
            className="editorial-card block px-6 py-6 transition-transform hover:-translate-y-0.5"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/45">
              {issue.rangeLabel}
            </div>
            <div className="mt-3 text-2xl font-semibold text-black">{issue.label}</div>
            <p className="mt-4 line-clamp-3 text-sm leading-7 text-black/62">
              {issue.summary || "Open the weekly brief to browse the grouped issue archive."}
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
      </section>
    </div>
  );
}

function TimelinePanel({ timelineDays }: { timelineDays: TimelineDay[] }) {
  return (
    <section className="editorial-card p-6 md:p-8">
      <div className="section-label">Day Timeline</div>
      <div className="mt-8 space-y-7">
        {timelineDays.map((day, index) => (
          <div key={day.date} className="timeline-row">
            <div className="timeline-axis">
              <span className="timeline-dot" />
              {index < timelineDays.length - 1 ? <span className="timeline-line" /> : null}
            </div>
            <div className="flex-1 pb-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-black/42">
                {dayjs(day.date).format("YYYY.MM.DD")}
              </div>
              <Link
                href={`/${day.date}`}
                className="mt-2 block text-2xl font-semibold leading-tight text-black"
              >
                {day.title}
              </Link>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-black/65">{day.summary}</p>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {day.keyTitles.map((title, itemIndex) => (
                  <div
                    key={`${day.date}-${itemIndex}`}
                    className="border-t border-black/10 pt-3 text-sm leading-6 text-black/68"
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
  dailyIssues,
  weeklyIssues,
  timelineDays,
}: HomeTabsProps) {
  const [activeTab, setActiveTab] = useState<HomeTab>("daily");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <TabButton active={activeTab === "daily"} onClick={() => setActiveTab("daily")}>
          Daily
        </TabButton>
        <TabButton active={activeTab === "weekly"} onClick={() => setActiveTab("weekly")}>
          Weekly
        </TabButton>
        <TabButton
          active={activeTab === "timeline"}
          onClick={() => setActiveTab("timeline")}
        >
          Timeline
        </TabButton>
      </div>

      {activeTab === "daily" ? <DailyPanel dailyIssues={dailyIssues} /> : null}
      {activeTab === "weekly" ? <WeeklyPanel weeklyIssues={weeklyIssues} /> : null}
      {activeTab === "timeline" ? <TimelinePanel timelineDays={timelineDays} /> : null}
    </div>
  );
}
