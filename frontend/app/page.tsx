import dayjs from "dayjs";
import HomeTabs from "@/components/HomeTabs";
import PublicationShell from "@/components/PublicationShell";
import {
  getAllDailyIssues,
  getTimelineDays,
  getWeeklyIssues,
} from "@/lib/content-loader";

export default function HomePage() {
  const dailyIssues = getAllDailyIssues();
  const weeklyIssues = getWeeklyIssues();
  const timelineDays = getTimelineDays(14);
  const leadIssue = dailyIssues[0];
  const headerMeta = [
    leadIssue ? dayjs(leadIssue.date).format("YYYY.MM.DD") : null,
    dailyIssues.length > 0 ? `${dailyIssues.length} daily issues` : null,
    weeklyIssues.length > 0 ? `${weeklyIssues.length} weekly briefs` : null,
    timelineDays.length > 0 ? `${timelineDays.length} timeline days` : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <PublicationShell
      currentDate={dailyIssues[0]?.date}
      dailyIssues={dailyIssues}
      header={{
        section: "Front Page",
        title: leadIssue?.title ?? "Editorial Archive",
        meta: headerMeta,
      }}
      weeklyIssues={weeklyIssues}
    >
      {dailyIssues.length > 0 ? (
        <HomeTabs
          dailyIssues={dailyIssues}
          timelineDays={timelineDays}
          weeklyIssues={weeklyIssues}
        />
      ) : (
        <section className="editorial-card px-6 py-14 md:px-10">
          <div className="section-label">No Issues Yet</div>
          <h1 className="display-title mt-8">Run the pipeline to populate the archive.</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-black/65">
            This front page expects daily markdown issues under the shared content
            directory. Once they exist, the home shell will automatically populate
            daily, weekly, and timeline views.
          </p>
        </section>
      )}
    </PublicationShell>
  );
}
