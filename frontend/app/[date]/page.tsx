import dayjs from "dayjs";
import { notFound } from "next/navigation";
import DailyReport from "@/components/DailyReport";
import PublicationShell from "@/components/PublicationShell";
import {
  getAllDates,
  getAllDailyIssues,
  getDailyIssue,
  getWeeklyIssues,
} from "@/lib/content-loader";

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

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
          <div>
            <div className="section-label">本期摘要</div>
            <p className="mt-6 max-w-3xl text-base leading-8 text-black/78">
              {issue.summary || "下方保留原始 Markdown 正文，可直接进入完整阅读。"}
            </p>
          </div>
          <div className="space-y-3 border-l border-black/10 pl-0 xl:pl-6">
            <div className="section-label">内容概览</div>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div className="metric-card">
                <div className="metric-value">{issue.meta?.itemCount ?? 0}</div>
                <div className="metric-label">资讯数</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{issue.meta?.avgScore ?? 0}</div>
                <div className="metric-label">均分</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <DailyReport content={issue.content} />
      </section>
    </PublicationShell>
  );
}
