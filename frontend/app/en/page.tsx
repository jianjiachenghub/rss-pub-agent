import HomeTabs from "@/components/HomeTabs";
import PublicationShell from "@/components/PublicationShell";
import {
  getAllDailyIssues,
  getTimelineDays,
  getWeeklyIssues,
} from "@/lib/content-loader";

export default function EnglishHomePage() {
  const dailyIssues = getAllDailyIssues("en");
  const weeklyIssues = getWeeklyIssues("en");
  const timelineDays = getTimelineDays(14, "en");

  return (
    <PublicationShell
      locale="en"
      dailyIssues={dailyIssues}
      activeNav="home"
      weeklyIssues={weeklyIssues}
    >
      {weeklyIssues.length > 0 || timelineDays.length > 0 ? (
        <HomeTabs
          locale="en"
          dailyIssues={dailyIssues}
          timelineDays={timelineDays}
          weeklyIssues={weeklyIssues}
        />
      ) : (
        <section className="editorial-card px-6 py-14 md:px-10">
          <div className="section-label">No content yet</div>
          <h1 className="display-title mt-8">
            Run the pipeline once and the archive will show up here.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-black/72">
            The homepage reads from the shared content archive and assembles daily
            issues, weekly digests, and a time-based timeline automatically.
          </p>
        </section>
      )}
    </PublicationShell>
  );
}
