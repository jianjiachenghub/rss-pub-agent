import PodcastPlayer from "@/components/PodcastPlayer";
import PublicationShell from "@/components/PublicationShell";
import {
  getAllDailyIssues,
  getAllDates,
  getDailyMeta,
  getPodcastScript,
  getWeeklyIssues,
} from "@/lib/content-loader";

export default function PodcastPage() {
  const dailyIssues = getAllDailyIssues();
  const weeklyIssues = getWeeklyIssues();
  const podcasts = getAllDates()
    .map((date) => {
      const meta = getDailyMeta(date);
      const script = getPodcastScript(date);
      return script ? { date, script, hasPodcast: meta?.hasPodcast ?? false } : null;
    })
    .filter((podcast): podcast is NonNullable<typeof podcast> => podcast !== null);

  return (
    <PublicationShell
      currentDate={dailyIssues[0]?.date}
      dailyIssues={dailyIssues}
      masthead={
        <div className="w-full max-w-3xl text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-black/45">
            Podcast Scripts / Archive Playback
          </div>
          <div className="mt-2 text-sm leading-6 text-black/62">
            Browse generated scripts alongside the editorial issue archive.
          </div>
        </div>
      }
      weeklyIssues={weeklyIssues}
    >
      <section className="editorial-card p-6 md:p-8">
        <div className="section-label">Podcast Archive</div>
        <div className="mt-8 space-y-4">
          {podcasts.length === 0 ? (
            <p className="text-sm leading-7 text-black/62">No podcast script has been published yet.</p>
          ) : (
            podcasts.map((podcast) => (
              <PodcastPlayer key={podcast.date} date={podcast.date} script={podcast.script} />
            ))
          )}
        </div>
      </section>
    </PublicationShell>
  );
}
