import dayjs from "dayjs";
import { notFound } from "next/navigation";
import DailyOutline from "@/components/DailyOutline";
import DailyReport from "@/components/DailyReport";
import PublicationShell from "@/components/PublicationShell";
import {
  getAllDates,
  getAllDailyIssues,
  getDailyIssue,
  getWeeklyIssues,
} from "@/lib/content-loader";
import { parseDailyReport } from "@/lib/daily-report";

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllDates().map((date) => ({ date }));
}

export default async function DailyPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const issue = getDailyIssue(date);

  if (!issue) notFound();

  const dailyIssues = getAllDailyIssues();
  const weeklyIssues = getWeeklyIssues();
  const focusTitles = issue.keyTitles.slice(0, 3);
  const categoryList = issue.meta?.categories ?? [];
  const report = parseDailyReport(issue.content);

  return (
    <PublicationShell currentDate={date} dailyIssues={dailyIssues} weeklyIssues={weeklyIssues}>
      <section className="editorial-card hero-card px-6 py-6 md:px-8 md:py-8">
        <div className="page-intro">
          <div className="page-kicker">日报阅读</div>
          <h1 className="page-title">{issue.title}</h1>
          <div className="page-meta-row">
            <span className="page-meta-pill">
              发布于 {dayjs(issue.date).format("YYYY.MM.DD")}
            </span>
            {issue.meta ? (
              <span className="page-meta-pill">{issue.meta.itemCount} 条资讯</span>
            ) : null}
            {issue.meta ? (
              <span className="page-meta-pill">均分 {issue.meta.avgScore}</span>
            ) : null}
            {issue.heroImageUrl ? <span className="page-meta-pill">含图片</span> : null}
            {issue.meta?.hasPodcast ? <span className="page-meta-pill">含播客</span> : null}
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
          <div>
            <div className="section-label">本期焦点</div>
            {focusTitles.length > 0 ? (
              <ol className="hero-focus-list" aria-label="本期焦点">
                {focusTitles.map((title, index) => (
                  <li key={`${index + 1}-${title}`} className="hero-focus-item">
                    <span className="hero-focus-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="hero-focus-title">{title}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="hero-summary-fallback">
                {issue.summary || "下方保留原始 Markdown 正文，可直接进入完整阅读。"}
              </p>
            )}
          </div>
          <div className="hero-overview-stack xl:border-l xl:border-black/10 xl:pl-6">
            <div className="section-label">内容概览</div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="metric-card">
                <div className="metric-value">{issue.meta?.itemCount ?? 0}</div>
                <div className="metric-label">资讯数</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{issue.meta?.avgScore ?? 0}</div>
                <div className="metric-label">均分</div>
              </div>
            </div>
            {categoryList.length > 0 ? (
              <div className="hero-chip-panel">
                <div className="hero-chip-label">覆盖分类</div>
                <div className="hero-chip-list">
                  {categoryList.map((category) => (
                    <span key={category} className="hero-chip">
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_18.5rem]">
        <div className="xl:order-2">
          <DailyOutline outline={report.outline} />
        </div>
        <div className="xl:order-1">
          <DailyReport sections={report.sections} />
        </div>
      </section>
    </PublicationShell>
  );
}
