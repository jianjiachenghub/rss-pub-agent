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
  const headerMeta = [
    dayjs(issue.date).format("YYYY.MM.DD"),
    issue.meta ? `${issue.meta.itemCount} items` : null,
    issue.meta ? `avg ${issue.meta.avgScore}` : null,
    issue.heroImageUrl ? "image" : null,
    issue.meta?.hasPodcast ? "podcast" : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <PublicationShell
      currentDate={date}
      dailyIssues={dailyIssues}
      header={{
        section: "Daily Issue",
        title: issue.title,
        meta: headerMeta,
      }}
      weeklyIssues={weeklyIssues}
    >
      <section className="editorial-card px-6 py-6 md:px-8 md:py-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-black/42">
          {issue.date}
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
          <div>
            <div className="section-label">Issue Note</div>
            <p className="mt-6 max-w-3xl text-base leading-8 text-black/68">
              {issue.summary || "Read the full markdown issue below."}
            </p>
          </div>
          <div className="space-y-3 border-l border-black/10 pl-0 xl:pl-6">
            <div className="section-label">Issue Meta</div>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div className="metric-card">
                <div className="metric-value">{issue.meta?.itemCount ?? 0}</div>
                <div className="metric-label">Items</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{issue.meta?.avgScore ?? 0}</div>
                <div className="metric-label">Avg Score</div>
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
