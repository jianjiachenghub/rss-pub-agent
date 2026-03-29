"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import dayjs from "dayjs";
import type { DailyIssue, TimelineDay, WeeklyIssue } from "@/lib/content-loader";
import ResilientImage from "@/components/ResilientImage";

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
      className={`tab-button ${active ? "tab-button-active" : ""}`}
    >
      {children}
    </button>
  );
}

function MetaLine({ issue }: { issue: DailyIssue }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.2em] text-black/60">
      <span>{dayjs(issue.date).format("YYYY.MM.DD")}</span>
      {issue.meta ? <span>{issue.meta.itemCount} 条资讯</span> : null}
      {issue.meta ? <span>均分 {issue.meta.avgScore}</span> : null}
      {issue.heroImageUrl ? <span>含图片</span> : null}
      {issue.meta?.hasPodcast ? <span>含播客</span> : null}
    </div>
  );
}

function DailyPanel({ dailyIssues }: { dailyIssues: DailyIssue[] }) {
  const leadIssue = dailyIssues[0];
  const recentIssues = dailyIssues.slice(1, 5);

  if (!leadIssue) {
    return (
      <section className="editorial-card px-6 py-10">
        <div className="section-label">暂无内容</div>
        <p className="mt-6 text-base leading-8 text-black/72">
          先运行一次内容流水线，日报、周报和时间线才会出现在这里。
        </p>
      </section>
    );
  }

  return (
    <div className="panel-enter space-y-10">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.85fr)]">
        <article className="editorial-card hero-card p-6 md:p-8">
          <div className="section-label">最新日报</div>
          <div className="mt-8 space-y-6">
            <MetaLine issue={leadIssue} />
            <div className="space-y-4">
              <h1 className="display-title display-title-compact max-w-4xl">
                {leadIssue.title}
              </h1>
              <p className="max-w-3xl text-lg leading-9 text-black/78">
                {leadIssue.summary || "打开最新一期，查看当日关键信号和完整正文。"}
              </p>
            </div>
            {leadIssue.heroImageUrl ? (
              <ResilientImage
                alt={leadIssue.title}
                className="hero-media h-[22rem] w-full object-cover"
                fallback="placeholder"
                placeholderHint="头图暂不可用"
                src={leadIssue.heroImageUrl}
              />
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/${leadIssue.date}`} className="action-chip">
                进入详细阅读
              </Link>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-black/60">
                {leadIssue.keyTitles.length} 个重点条目
              </span>
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="section-label">最近归档</div>
          {recentIssues.map((issue) => (
            <Link
              key={issue.date}
              href={`/${issue.date}`}
              className="editorial-card interactive-panel surface-link story-card block px-5 py-5"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/58">
                {dayjs(issue.date).format("YYYY.MM.DD")}
              </div>
              <h2 className="mt-3 text-xl font-semibold leading-tight text-black">
                <span className="hover-underline">{issue.title}</span>
              </h2>
              <p className="mt-3 line-clamp-3 text-sm leading-7 text-black/72">
                {issue.summary || "查看这一期的重点概览和完整 Markdown 正文。"}
              </p>
            </Link>
          ))}
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <article className="editorial-card p-6 md:p-8">
          <div className="section-label">今日重点</div>
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            {leadIssue.keyTitles.map((title, index) => (
              <div key={`${title}-${index}`} className="border-t border-black/12 pt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/46">
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
          <div className="section-label">继续关注</div>
          <div className="mt-7 space-y-4">
            {(leadIssue.watchSignals.length > 0
              ? leadIssue.watchSignals
              : [
                  "打开最新一期，查看完整的观察变量列表。",
                  "也可以切到时间线，对比连续几天的变化。",
                ]
            ).map((signal, index) => (
              <div key={`${signal}-${index}`} className="border-t border-black/12 pt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/46">
                  信号 {String(index + 1).padStart(2, "0")}
                </div>
                <div className="mt-2 text-base leading-7 text-black/78">{signal}</div>
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
        <div className="section-label">暂无周报</div>
        <p className="mt-6 text-base leading-8 text-black/72">
          有足够多的日更内容后，这里会自动整理成按月分周的周报。
        </p>
      </section>
    );
  }

  return (
    <div className="panel-enter space-y-8">
      <article className="editorial-card hero-card grid gap-8 p-6 md:p-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
        <div>
          <div className="section-label">最新周报</div>
          <div className="mt-8 font-mono text-[11px] uppercase tracking-[0.22em] text-black/60">
            {leadIssue.rangeLabel}
          </div>
          <h1 className="display-title mt-4 max-w-4xl">{leadIssue.label}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-9 text-black/78">
            {leadIssue.summary || "这里会基于当前归档日报，整理出这一周的摘要和重点。"}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/weekly/${leadIssue.weekId}`} className="action-chip">
              打开本周周报
            </Link>
            {leadIssue.categories.map((category) => (
              <span key={category} className="outline-chip">
                {category}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4 border-l border-black/10 pl-0 xl:pl-6">
          <div className="section-label">周报概览</div>
          <div className="grid grid-cols-2 gap-3 pt-4">
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
          </div>
        </div>
      </article>

      <section className="grid gap-5 lg:grid-cols-2">
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
      </section>
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
              <p className="mt-3 max-w-3xl text-sm leading-7 text-black/74">{day.summary}</p>
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
  dailyIssues,
  weeklyIssues,
  timelineDays,
}: HomeTabsProps) {
  const [activeTab, setActiveTab] = useState<HomeTab>("daily");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <TabButton active={activeTab === "daily"} onClick={() => setActiveTab("daily")}>
          日报
        </TabButton>
        <TabButton active={activeTab === "weekly"} onClick={() => setActiveTab("weekly")}>
          周报
        </TabButton>
        <TabButton
          active={activeTab === "timeline"}
          onClick={() => setActiveTab("timeline")}
        >
          时间线
        </TabButton>
      </div>

      {activeTab === "daily" ? <DailyPanel dailyIssues={dailyIssues} /> : null}
      {activeTab === "weekly" ? <WeeklyPanel weeklyIssues={weeklyIssues} /> : null}
      {activeTab === "timeline" ? <TimelinePanel timelineDays={timelineDays} /> : null}
    </div>
  );
}
