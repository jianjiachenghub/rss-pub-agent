import dayjs from "dayjs";
import { notFound } from "next/navigation";
import DailyReport from "@/components/DailyReport";
import DailyReportOutline from "@/components/DailyReportOutline";
import PublicationShell from "@/components/PublicationShell";
import {
  getAllDates,
  getAllDailyIssues,
  getDailyIssue,
  getWeeklyIssues,
} from "@/lib/content-loader";
import { parseDailyReport } from "@/lib/daily-report-parser";

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
  const report = parseDailyReport(issue.content);

  return (
    <PublicationShell currentDate={date} dailyIssues={dailyIssues} weeklyIssues={weeklyIssues} activeNav="daily">
      <div className="daily-detail-grid">
        <div className="min-w-0">
          <section className="editorial-card hero-card px-6 py-6 md:px-8 md:py-8">
            <div className="hero-header-row">
              <div className="page-intro">
                <div className="page-kicker">日报阅读</div>
                <h1 className="page-title page-title-tight">{issue.title}</h1>
              </div>
              <div className="hero-meta-side">
                <span className="page-meta-pill">
                  {dayjs(issue.date).format("YYYY.MM.DD")}
                </span>
                {issue.meta ? (
                  <span className="page-meta-pill">{issue.meta.itemCount} 条</span>
                ) : null}
                {issue.meta ? (
                  <span className="page-meta-pill">均分 {issue.meta.avgScore}</span>
                ) : null}
                {issue.meta?.hasPodcast ? <span className="page-meta-pill">播客</span> : null}
              </div>
            </div>
          </section>

          <section className="mt-8">
            <DailyReport report={report} />
          </section>
        </div>

        <div className="hidden xl:block">
          <DailyReportOutline sections={report.outline} />
        </div>
      </div>
    </PublicationShell>
  );
}
