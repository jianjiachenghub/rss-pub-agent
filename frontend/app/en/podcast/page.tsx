import dayjs from "dayjs";
import PodcastPlayer from "@/components/PodcastPlayer";
import PublicationShell from "@/components/PublicationShell";
import {
  getAllDailyIssues,
  getAllDates,
  getDailyMeta,
  getPodcastScript,
  getWeeklyIssues,
} from "@/lib/content-loader";

export default function EnglishPodcastPage() {
  const dailyIssues = getAllDailyIssues("en");
  const weeklyIssues = getWeeklyIssues("en");
  const podcasts = getAllDates()
    .map((date) => {
      const meta = getDailyMeta(date);
      const script = getPodcastScript(date, "en");
      return script ? { date, script, hasPodcast: meta?.hasPodcast ?? false } : null;
    })
    .filter((podcast): podcast is NonNullable<typeof podcast> => podcast !== null);
  const latestPodcastDate = podcasts[0]?.date;

  return (
    <PublicationShell
      locale="en"
      currentDate={dailyIssues[0]?.date}
      dailyIssues={dailyIssues}
      activeNav="podcast"
      weeklyIssues={weeklyIssues}
    >
      <section className="editorial-card hero-card p-6 md:p-8">
        <div className="page-intro">
          <div className="page-kicker">Podcast archive</div>
          <h1 className="page-title">
            {podcasts.length > 0 ? "Podcast scripts" : "No podcast scripts yet"}
          </h1>
          <div className="page-meta-row">
            {latestPodcastDate ? (
              <span className="page-meta-pill">
                Latest script {dayjs(latestPodcastDate).format("YYYY.MM.DD")}
              </span>
            ) : null}
            {podcasts.length > 0 ? (
              <span className="page-meta-pill">{podcasts.length} scripts</span>
            ) : null}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {podcasts.length === 0 ? (
            <p className="text-sm leading-7 text-black/72">
              There are no playable podcast scripts in the archive yet.
            </p>
          ) : (
            podcasts.map((podcast) => (
              <PodcastPlayer
                key={podcast.date}
                locale="en"
                date={podcast.date}
                script={podcast.script}
              />
            ))
          )}
        </div>
      </section>
    </PublicationShell>
  );
}
