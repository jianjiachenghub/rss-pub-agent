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

  return (
    <PublicationShell
      currentDate={dailyIssues[0]?.date}
      dailyIssues={dailyIssues}
      masthead={
        <div className="w-full max-w-3xl text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-black/45">
            Front Page / Daily Weekly Timeline
          </div>
          <div className="mt-2 text-sm leading-6 text-black/62">
            A black-and-white editorial archive for scanning the latest issue,
            weekly briefings, and day-level shifts.
          </div>
        </div>
      }
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
